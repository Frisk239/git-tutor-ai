/**
 * MCP Hub - MCP 协议中心管理器
 * 参考 Cline 的 McpHub 实现
 *
 * 负责:
 * - MCP 服务器连接管理
 * - 工具和资源发现
 * - OAuth 认证协调
 * - 文件监听和热重载
 * - 实时通知处理
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { ListToolsResult } from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import chokidar from 'chokidar';
import { nanoid } from 'nanoid';
import { McpOAuthManager } from './oauth.js';
import type {
  McpConnection,
  McpNotification,
  McpResource,
  McpResourceTemplate,
  McpServer,
  McpServerConfig,
  McpServerStatus,
  McpTool,
  McpToolResult,
} from './types.js';

/**
 * MCP Hub 类
 */
export class McpHub {
  private connections: Map<string, McpConnection> = new Map();
  private oauthManager: McpOAuthManager;
  private fileWatchers: Map<string, chokidar.FSWatcher> = new Map();
  private isConnecting: boolean = false;
  private pendingNotifications: McpNotification[] = [];
  private notificationCallback?: (notification: McpNotification) => void;

  constructor(
    private mcpServersPath: string,
    private clientVersion: string = '0.1.0'
  ) {
    this.oauthManager = new McpOAuthManager();
  }

  /**
   * 获取所有服务器
   */
  getServers(): McpServer[] {
    return Array.from(this.connections.values())
      .filter((conn) => !conn.server.disabled)
      .map((conn) => conn.server);
  }

  /**
   * 获取单个服务器
   */
  getServer(name: string): McpServer | undefined {
    const connection = this.connections.get(name);
    return connection?.server;
  }

  /**
   * 初始化所有 MCP 服务器
   */
  async initialize(): Promise<void> {
    console.log('[McpHub] Initializing MCP servers...');

    try {
      const settings = await this.readSettingsFile();
      if (!settings || Object.keys(settings.mcpServers || {}).length === 0) {
        console.log('[McpHub] No MCP servers configured');
        return;
      }

      const serverConfigs = settings.mcpServers || {};
      await this.updateServerConnections(serverConfigs);

      console.log(`[McpHub] Initialized ${this.connections.size} MCP servers`);
    } catch (error) {
      console.error('[McpHub] Failed to initialize:', error);
    }
  }

  /**
   * 调用 MCP 工具
   */
  async callTool(
    serverName: string,
    toolName: string,
    arguments_: Record<string, unknown> | undefined
  ): Promise<McpToolResult> {
    const connection = this.connections.get(serverName);
    if (!connection) {
      throw new Error(`No connection found for server: ${serverName}`);
    }

    if (connection.server.disabled) {
      throw new Error(`Server "${serverName}" is disabled`);
    }

    try {
      const result = await connection.client.request(
        {
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: arguments_,
          },
        },
        undefined, // schema
        { timeout: this.getTimeout(connection) }
      );

      return result as McpToolResult;
    } catch (error) {
      console.error(`[McpHub] Tool call failed:`, error);
      throw error;
    }
  }

  /**
   * 读取 MCP 资源
   */
  async readResource(serverName: string, uri: string): Promise<any> {
    const connection = this.connections.get(serverName);
    if (!connection) {
      throw new Error(`No connection found for server: ${serverName}`);
    }

    try {
      const result = await connection.client.request(
        {
          method: 'resources/read',
          params: { uri },
        },
        undefined
      );

      return result;
    } catch (error) {
      console.error(`[McpHub] Resource read failed:`, error);
      throw error;
    }
  }

  /**
   * 添加远程服务器
   */
  async addRemoteServer(
    name: string,
    url: string,
    transportType: 'sse' | 'streamableHttp' = 'streamableHttp'
  ): Promise<void> {
    const settings = await this.readSettingsFile();
    if (!settings) {
      throw new Error('Failed to read MCP settings');
    }

    if (settings.mcpServers?.[name]) {
      throw new Error(`MCP server "${name}" already exists`);
    }

    const serverConfig: McpServerConfig = {
      name,
      type: transportType,
      url,
      disabled: false,
      timeout: 60,
    };

    settings.mcpServers = { ...settings.mcpServers, [name]: serverConfig };

    await this.writeSettingsFile(settings);
    await this.updateServerConnections(settings.mcpServers);
  }

  /**
   * 删除服务器
   */
  async deleteServer(name: string): Promise<void> {
    const settings = await this.readSettingsFile();
    if (!settings?.mcpServers?.[name]) {
      throw new Error(`MCP server "${name}" not found`);
    }

    delete settings.mcpServers[name];

    // 断开连接
    const connection = this.connections.get(name);
    if (connection) {
      try {
        await connection.client.close();
      } catch (error) {
        console.error(`[McpHub] Error closing connection:`, error);
      }
      this.connections.delete(name);
    }

    // 清除文件监听
    const watcher = this.fileWatchers.get(name);
    if (watcher) {
      await watcher.close();
      this.fileWatchers.delete(name);
    }

    await this.writeSettingsFile(settings);
  }

  /**
   * 重启服务器
   */
  async restartServer(name: string): Promise<void> {
    const settings = await this.readSettingsFile();
    if (!settings?.mcpServers?.[name]) {
      throw new Error(`MCP server "${name}" not found`);
    }

    const serverConfig = settings.mcpServers[name];
    await this.connectToServer(name, serverConfig);
  }

  /**
   * 切换服务器启用/禁用状态
   */
  async toggleServer(name: string, disabled: boolean): Promise<void> {
    const settings = await this.readSettingsFile();
    if (!settings?.mcpServers?.[name]) {
      throw new Error(`MCP server "${name}" not found`);
    }

    settings.mcpServers[name].disabled = disabled;
    await this.writeSettingsFile(settings);
    await this.connectToServer(name, settings.mcpServers[name]);
  }

  /**
   * 设置通知回调
   */
  setNotificationCallback(callback: (notification: McpNotification) => void): void {
    this.notificationCallback = callback;

    // 发送待处理的通知
    while (this.pendingNotifications.length > 0) {
      const notification = this.pendingNotifications.shift();
      if (notification) {
        callback(notification);
      }
    }
  }

  /**
   * 获取待处理的通知
   */
  getPendingNotifications(): McpNotification[] {
    return [...this.pendingNotifications];
  }

  /**
   * 清空待处理通知
   */
  clearPendingNotifications(): void {
    this.pendingNotifications = [];
  }

  /**
   * 销毁所有连接
   */
  async destroy(): Promise<void> {
    console.log('[McpHub] Destroying all MCP connections...');

    // 关闭所有文件监听
    for (const watcher of this.fileWatchers.values()) {
      await watcher.close();
    }
    this.fileWatchers.clear();

    // 关闭所有连接
    for (const connection of this.connections.values()) {
      try {
        await connection.client.close();
      } catch (error) {
        console.error('[McpHub] Error closing connection:', error);
      }
    }
    this.connections.clear();

    console.log('[McpHub] All MCP connections destroyed');
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 读取设置文件
   */
  private async readSettingsFile(): Promise<any> {
    try {
      const settingsPath = path.join(this.mcpServersPath, 'mcp-settings.json');
      const content = await fs.readFile(settingsPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('[McpHub] Failed to read settings file:', error);
      return { mcpServers: {} };
    }
  }

  /**
   * 写入设置文件
   */
  private async writeSettingsFile(settings: any): Promise<void> {
    try {
      await fs.mkdir(this.mcpServersPath, { recursive: true });
      const settingsPath = path.join(this.mcpServersPath, 'mcp-settings.json');
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    } catch (error) {
      console.error('[McpHub] Failed to write settings file:', error);
      throw error;
    }
  }

  /**
   * 更新服务器连接
   */
  private async updateServerConnections(
    serverConfigs: Record<string, McpServerConfig>
  ): Promise<void> {
    const serverNames = Object.keys(serverConfigs);

    // 移除不再配置的连接
    for (const [name, connection] of this.connections.entries()) {
      if (!serverNames.includes(name)) {
        try {
          await connection.client.close();
        } catch (error) {
          console.error(`[McpHub] Error closing connection for ${name}:`, error);
        }
        this.connections.delete(name);

        const watcher = this.fileWatchers.get(name);
        if (watcher) {
          await watcher.close();
          this.fileWatchers.delete(name);
        }
      }
    }

    // 连接到所有配置的服务器
    for (const [name, config] of Object.entries(serverConfigs)) {
      await this.connectToServer(name, config);
    }
  }

  /**
   * 连接到单个服务器
   */
  private async connectToServer(name: string, config: McpServerConfig): Promise<void> {
    console.log(`[McpHub] Connecting to MCP server: ${name}`);

    // 移除现有连接
    const existingConnection = this.connections.get(name);
    if (existingConnection) {
      try {
        await existingConnection.client.close();
      } catch (error) {
        console.error(`[McpHub] Error closing existing connection:`, error);
      }
      this.connections.delete(name);
    }

    // 如果禁用,创建禁用连接
    if (config.disabled) {
      const disabledConnection: McpConnection = {
        server: {
          name,
          config: JSON.stringify(config),
          status: 'disconnected' as McpServerStatus,
          disabled: true,
          uid: this.getServerKey(name),
        },
        client: null as unknown as Client,
        transport: null as unknown as any,
      };
      this.connections.set(name, disabledConnection);
      return;
    }

    try {
      // 创建客户端
      const client = new Client(
        {
          name: 'git-tutor-ai',
          version: this.clientVersion,
        },
        {
          capabilities: {},
        }
      );

      // 创建传输层
      let transport: any;

      if (config.type === 'stdio') {
        transport = new StdioClientTransport({
          command: config.command!,
          args: config.args || [],
          cwd: config.cwd,
          env: { ...process.env, ...(config.env || {}) },
          stderr: 'pipe',
        });

        // 设置错误处理
        transport.onerror = (error: Error) => {
          console.error(`[McpHub] Transport error for "${name}":`, error);
          const connection = this.connections.get(name);
          if (connection) {
            connection.server.status = 'error' as McpServerStatus;
            connection.server.error = error.message;
          }
        };

        transport.onclose = () => {
          console.log(`[McpHub] Transport closed for "${name}"`);
          const connection = this.connections.get(name);
          if (connection) {
            connection.server.status = 'disconnected' as McpServerStatus;
          }
        };

        await transport.start();
      } else if (config.type === 'sse') {
        transport = new SSEClientTransport(new URL(config.url!), {
          requestInit: {
            headers: config.headers,
          },
        });
      } else if (config.type === 'streamableHttp') {
        transport = new StreamableHTTPClientTransport(new URL(config.url!), {
          requestInit: {
            headers: config.headers,
          },
        });
      } else {
        throw new Error(`Unknown transport type: ${config.type}`);
      }

      // 创建连接
      const connection: McpConnection = {
        server: {
          name,
          config: JSON.stringify(config),
          status: 'connecting' as McpServerStatus,
          disabled: config.disabled,
          uid: this.getServerKey(name),
        },
        client,
        transport,
      };

      this.connections.set(name, connection);

      // 连接客户端
      await client.connect(transport);

      // 连接成功
      connection.server.status = 'connected' as McpServerStatus;
      connection.server.error = undefined;

      // 设置通知处理器
      this.setupNotificationHandlers(connection, name);

      // 获取工具和资源列表
      connection.server.tools = await this.fetchToolsList(name);
      connection.server.resources = await this.fetchResourcesList(name);
      connection.server.resourceTemplates = await this.fetchResourceTemplatesList(name);

      console.log(`[McpHub] Successfully connected to ${name}`);
      console.log(`[McpHub] - Tools: ${connection.server.tools.length}`);
      console.log(`[McpHub] - Resources: ${connection.server.resources.length}`);

      // 设置文件监听(仅 stdio)
      if (config.type === 'stdio') {
        this.setupFileWatcher(name, config);
      }
    } catch (error) {
      console.error(`[McpHub] Failed to connect to ${name}:`, error);

      const errorConnection: McpConnection = {
        server: {
          name,
          config: JSON.stringify(config),
          status: 'error' as McpServerStatus,
          error: (error as Error).message,
          uid: this.getServerKey(name),
        },
        client: null as unknown as Client,
        transport: null as unknown as any,
      };

      this.connections.set(name, errorConnection);
    }
  }

  /**
   * 获取工具列表
   */
  private async fetchToolsList(serverName: string): Promise<McpTool[]> {
    const connection = this.connections.get(serverName);
    if (!connection) {
      return [];
    }

    try {
      const result = await connection.client.request({ method: 'tools/list' }, undefined);

      const toolsResult = result as ListToolsResult;
      return (toolsResult.tools || []).map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: JSON.stringify(tool.inputSchema),
      }));
    } catch (error) {
      console.error(`[McpHub] Failed to fetch tools for ${serverName}:`, error);
      return [];
    }
  }

  /**
   * 获取资源列表
   */
  private async fetchResourcesList(serverName: string): Promise<McpResource[]> {
    const connection = this.connections.get(serverName);
    if (!connection) {
      return [];
    }

    try {
      const result = await connection.client.request({ method: 'resources/list' }, undefined);

      return (result.resources || []).map((resource: any) => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
      }));
    } catch (error) {
      console.error(`[McpHub] Failed to fetch resources for ${serverName}:`, error);
      return [];
    }
  }

  /**
   * 获取资源模板列表
   */
  private async fetchResourceTemplatesList(serverName: string): Promise<McpResourceTemplate[]> {
    const connection = this.connections.get(serverName);
    if (!connection) {
      return [];
    }

    try {
      const result = await connection.client.request(
        { method: 'resources/templates/list' },
        undefined
      );

      return (result.resourceTemplates || []).map((template: any) => ({
        uriTemplate: template.uriTemplate,
        name: template.name,
        description: template.description,
        mimeType: template.mimeType,
      }));
    } catch (error) {
      console.error(`[McpHub] Failed to fetch resource templates for ${serverName}:`, error);
      return [];
    }
  }

  /**
   * 设置通知处理器
   */
  private setupNotificationHandlers(connection: McpConnection, serverName: string): void {
    connection.client.setNotificationHandler(
      { method: 'notifications/message' } as any,
      (notification: any) => {
        const level = notification.params?.level || 'info';
        const message = notification.params?.message || '';

        const mcpNotification: McpNotification = {
          serverName,
          level,
          message,
          timestamp: Date.now(),
        };

        if (this.notificationCallback) {
          this.notificationCallback(mcpNotification);
        } else {
          this.pendingNotifications.push(mcpNotification);
        }
      }
    );
  }

  /**
   * 设置文件监听(用于 stdio 服务器热重载)
   */
  private setupFileWatcher(name: string, config: McpServerConfig): void {
    // 查找构建文件路径
    const buildFilePath = config.args?.find((arg: string) => arg.includes('build/index.js'));

    if (!buildFilePath) {
      return;
    }

    console.log(`[McpHub] Setting up file watcher for ${name}: ${buildFilePath}`);

    const watcher = chokidar.watch(buildFilePath, {
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on('change', () => {
      console.log(`[McpHub] Detected change in ${buildFilePath}. Restarting server ${name}...`);
      this.connectToServer(name, config);
    });

    this.fileWatchers.set(name, watcher);
  }

  /**
   * 获取服务器超时时间
   */
  private getTimeout(connection: McpConnection): number {
    try {
      const config = JSON.parse(connection.server.config) as McpServerConfig;
      return (config.timeout || 60) * 1000; // 转换为毫秒
    } catch (error) {
      return 60000; // 默认 60 秒
    }
  }

  /**
   * 生成服务器唯一键
   */
  private getServerKey(name: string): string {
    return nanoid();
  }
}
