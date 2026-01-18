/**
 * MCP OAuth 认证管理器
 * 参考 Cline 的 McpOAuthManager 实现
 */

import crypto from "node:crypto";
import type { OAuthClientProvider, OAuthTokens } from "@modelcontextprotocol/sdk/client/auth.js";
import type { McpOAuthStatus } from "./types.js";

/**
 * OAuth 密钥存储
 */
interface McpOAuthSecrets {
  [serverHash: string]: {
    /** OAuth 令牌 */
    tokens?: OAuthTokens;
    /** 令牌保存时间 */
    tokens_saved_at?: number;
    /** 客户端信息 */
    client_info?: any;
    /** PKCE 代码验证器 */
    code_verifier?: string;
    /** OAuth 状态 */
    oauth_state?: string;
    /** OAuth 状态时间戳 */
    oauth_state_timestamp?: number;
    /** 待处理的认证 URL */
    pending_auth_url?: string;
  };
}

/**
 * Git Tutor AI OAuth 客户端提供商
 */
class GitTutorOAuthProvider implements OAuthClientProvider {
  private serverName: string;
  private serverUrl: string;
  private serverHash: string;
  private _redirectUrl: string = "";

  constructor(serverName: string, serverUrl: string) {
    this.serverName = serverName;
    this.serverUrl = serverUrl;
    this.serverHash = this.getServerHash(serverName, serverUrl);
  }

  /**
   * 初始化提供商
   */
  async initialize(): Promise<void> {
    // TODO: 从配置获取回调 URL
    this._redirectUrl = "http://localhost:3000/oauth/callback";
  }

  /**
   * 获取重定向 URL
   */
  get redirectUrl(): string {
    return this._redirectUrl;
  }

  /**
   * 客户端元数据
   */
  get clientMetadata() {
    return {
      redirect_uris: [this._redirectUrl],
      token_endpoint_auth_method: "none" as const,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_name: "Git Tutor AI",
      client_uri: "https://github.com/git-tutor-ai",
      software_id: "git-tutor-ai",
      logo_uri: "https://github.com/git-tutor-ai.png",
    };
  }

  /**
   * 生成 OAuth 状态
   */
  state(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * 获取客户端信息
   */
  async clientInformation(): Promise<any> {
    const secrets = this.getSecrets();
    return secrets[this.serverHash]?.client_info;
  }

  /**
   * 保存客户端信息
   */
  async saveClientInformation(clientInformation: any): Promise<void> {
    const secrets = this.getSecrets();
    if (!secrets[this.serverHash]) {
      secrets[this.serverHash] = {};
    }
    secrets[this.serverHash].client_info = clientInformation;
    this.saveSecrets(secrets);
  }

  /**
   * 获取令牌
   */
  async tokens(): Promise<OAuthTokens | undefined> {
    const secrets = this.getSecrets();
    const serverData = secrets[this.serverHash];

    if (!serverData?.tokens) {
      return undefined;
    }

    // 检查令牌是否过期
    if (serverData.tokens_saved_at && serverData.tokens.expires_in) {
      const expiresInMs = serverData.tokens.expires_in * 1000;
      if (serverData.tokens_saved_at + expiresInMs < Date.now()) {
        if (serverData.tokens.refresh_token) {
          return serverData.tokens; // SDK 会自动刷新
        } else {
          return undefined;
        }
      }
    }

    return serverData.tokens;
  }

  /**
   * 保存令牌
   */
  async saveTokens(tokens: OAuthTokens): Promise<void> {
    const secrets = this.getSecrets();
    if (!secrets[this.serverHash]) {
      secrets[this.serverHash] = {};
    }

    secrets[this.serverHash].tokens = tokens;
    secrets[this.serverHash].tokens_saved_at = Date.now();
    this.saveSecrets(secrets);
  }

  /**
   * 重定向到授权页面
   */
  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    const existingTokens = await this.tokens();
    if (existingTokens && existingTokens.access_token) {
      console.log(`[McpOAuth] Preserving existing tokens for ${this.serverName}`);
      return;
    }

    const state = this.state();
    authorizationUrl.searchParams.set("state", state);

    const secrets = this.getSecrets();
    if (!secrets[this.serverHash]) {
      secrets[this.serverHash] = {};
    }

    secrets[this.serverHash].oauth_state = state;
    secrets[this.serverHash].oauth_state_timestamp = Date.now();
    secrets[this.serverHash].pending_auth_url = authorizationUrl.toString();
    this.saveSecrets(secrets);

    // TODO: 打开浏览器进行认证
    console.log(`[McpOAuth] Authorization URL: ${authorizationUrl.toString()}`);
  }

  /**
   * 获取服务器 Hash
   */
  private getServerHash(serverName: string, serverUrl: string): string {
    return crypto.createHash("sha256").update(`${serverName}:${serverUrl}`).digest("hex");
  }

  /**
   * 获取密钥
   */
  private getSecrets(): McpOAuthSecrets {
    // TODO: 从安全存储读取
    try {
      return {};
    } catch (error) {
      console.error("[McpOAuth] Failed to parse secrets:", error);
      return {};
    }
  }

  /**
   * 保存密钥
   */
  private saveSecrets(secrets: McpOAuthSecrets): void {
    // TODO: 保存到安全存储
    console.log("[McpOAuth] Secrets saved");
  }
}

/**
 * MCP OAuth 管理器
 */
export class McpOAuthManager {
  private providers: Map<string, OAuthClientProvider> = new Map();
  private readonly STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 分钟

  /**
   * 获取或创建 OAuth 提供商
   */
  async getOrCreateProvider(serverName: string, serverUrl: string): Promise<OAuthClientProvider> {
    const key = `${serverName}:${serverUrl}`;
    if (this.providers.has(key)) {
      return this.providers.get(key)!;
    }

    const provider = new GitTutorOAuthProvider(serverName, serverUrl);
    await provider.initialize();
    this.providers.set(key, provider);
    return provider;
  }

  /**
   * 验证并清除 OAuth 状态
   */
  validateAndClearState(serverHash: string, state: string): boolean {
    // TODO: 实现状态验证
    return true;
  }

  /**
   * 清除服务器认证
   */
  async clearServerAuth(serverName: string, serverUrl: string): Promise<void> {
    const key = `${serverName}:${serverUrl}`;
    this.providers.delete(key);
    // TODO: 清除存储的密钥
  }

  /**
   * 获取待处理的认证 URL
   */
  getPendingAuthUrl(serverName: string, serverUrl: string): string | undefined {
    const serverHash = crypto.createHash("sha256").update(`${serverName}:${serverUrl}`).digest("hex");
    const secrets = this.getSecrets();
    return secrets[serverHash]?.pending_auth_url;
  }

  /**
   * 获取密钥
   */
  private getSecrets(): McpOAuthSecrets {
    // TODO: 从安全存储读取
    return {};
  }
}
