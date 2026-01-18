// 多 Workspace 管理器
// 参考 Cline 的多工作区支持实现

import { resolve, relative, join } from "path";
import { existsSync } from "fs";

/**
 * Workspace 信息
 */
export interface WorkspaceInfo {
  /** Workspace 唯一标识 */
  id: string;
  /** Workspace 路径 */
  path: string;
  /** Workspace 名称 (目录名) */
  name: string;
  /** 是否是主 workspace */
  isPrimary: boolean;
  /** Workspace URI (用于 VS Code 集成) */
  uri?: string;
}

/**
 * Workspace 管理器
 */
export class WorkspaceManager {
  private workspaces: Map<string, WorkspaceInfo> = new Map();
  private primaryWorkspaceId: string | null = null;

  constructor() {
    // 自动发现主 workspace
    this.discoverPrimaryWorkspace();
  }

  /**
   * 自动发现主 workspace (当前工作目录)
   */
  private discoverPrimaryWorkspace(): void {
    const cwd = process.cwd();
    const workspaceInfo: WorkspaceInfo = {
      id: "default",
      path: cwd,
      name: this.getWorkspaceName(cwd),
      isPrimary: true,
      uri: `file://${cwd}`,
    };

    this.workspaces.set(workspaceInfo.id, workspaceInfo);
    this.primaryWorkspaceId = workspaceInfo.id;
  }

  /**
   * 从路径提取 workspace 名称
   */
  private getWorkspaceName(path: string): string {
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || "root";
  }

  /**
   * 添加 workspace
   */
  addWorkspace(workspaceInfo: Omit<WorkspaceInfo, "id">): string {
    const id = this.generateWorkspaceId(workspaceInfo.path);
    const workspace: WorkspaceInfo = {
      ...workspaceInfo,
      id,
    };

    this.workspaces.set(id, workspace);
    return id;
  }

  /**
   * 移除 workspace
   */
  removeWorkspace(workspaceId: string): boolean {
    if (workspaceId === this.primaryWorkspaceId) {
      throw new Error("Cannot remove primary workspace");
    }
    return this.workspaces.delete(workspaceId);
  }

  /**
   * 获取 workspace
   */
  getWorkspace(workspaceId: string): WorkspaceInfo | undefined {
    return this.workspaces.get(workspaceId);
  }

  /**
   * 获取所有 workspace
   */
  getAllWorkspaces(): WorkspaceInfo[] {
    return Array.from(this.workspaces.values());
  }

  /**
   * 获取主 workspace
   */
  getPrimaryWorkspace(): WorkspaceInfo | undefined {
    if (this.primaryWorkspaceId) {
      return this.workspaces.get(this.primaryWorkspaceId);
    }
    return undefined;
  }

  /**
   * 设置主 workspace
   */
  setPrimaryWorkspace(workspaceId: string): void {
    if (!this.workspaces.has(workspaceId)) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    // 取消原有的主 workspace
    if (this.primaryWorkspaceId) {
      const oldPrimary = this.workspaces.get(this.primaryWorkspaceId);
      if (oldPrimary) {
        oldPrimary.isPrimary = false;
      }
    }

    // 设置新的主 workspace
    const newPrimary = this.workspaces.get(workspaceId);
    if (newPrimary) {
      newPrimary.isPrimary = true;
    }

    this.primaryWorkspaceId = workspaceId;
  }

  /**
   * 根据路径查找 workspace
   */
  findWorkspaceByPath(path: string): WorkspaceInfo | undefined {
    const resolvedPath = resolve(path);

    for (const workspace of this.workspaces.values()) {
      const workspacePath = resolve(workspace.path);
      const relativePath = relative(workspacePath, resolvedPath);

      // 如果相对路径不以 .. 开头,说明在这个 workspace 内
      if (!relativePath.startsWith("..")) {
        return workspace;
      }
    }

    return undefined;
  }

  /**
   * 解析路径 (自动识别所属 workspace)
   */
  resolvePath(path: string): {
    workspace: WorkspaceInfo;
    relativePath: string;
    absolutePath: string;
  } {
    // 如果是绝对路径
    if (path.startsWith("/") || path.match(/^[a-zA-Z]:/)) {
      const workspace = this.findWorkspaceByPath(path);
      if (!workspace) {
        throw new Error(`Path ${path} is not in any workspace`);
      }

      return {
        workspace,
        relativePath: relative(workspace.path, resolve(path)),
        absolutePath: resolve(path),
      };
    }

    // 如果是相对路径,使用主 workspace
    const primaryWorkspace = this.getPrimaryWorkspace();
    if (!primaryWorkspace) {
      throw new Error("No primary workspace found");
    }

    return {
      workspace: primaryWorkspace,
      relativePath: path,
      absolutePath: join(primaryWorkspace.path, path),
    };
  }

  /**
   * 生成 workspace ID
   */
  private generateWorkspaceId(path: string): string {
    return Buffer.from(path).toString("base64").substring(0, 16);
  }

  /**
   * 从 VS Code 多根工作区配置加载
   */
  async loadFromVSCodeConfig(): Promise<void> {
    const workspaceFile = join(process.cwd(), ".code", "workspace.json");

    if (!existsSync(workspaceFile)) {
      return;
    }

    try {
      const { readFile } = await import("fs/promises");
      const content = await readFile(workspaceFile, "utf-8");
      const config = JSON.parse(content);

      if (config.folders && Array.isArray(config.folders)) {
        for (const folder of config.folders) {
          const folderPath = folder.path;
          if (!folderPath) continue;

          const absolutePath = resolve(process.cwd(), folderPath);
          if (existsSync(absolutePath)) {
            this.addWorkspace({
              path: absolutePath,
              name: folder.name || this.getWorkspaceName(absolutePath),
              isPrimary: false,
              uri: folder.uri,
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to load VS Code workspace config:", error);
    }
  }

  /**
   * 检查路径是否在任何 workspace 中
   */
  isInAnyWorkspace(path: string): boolean {
    return this.findWorkspaceByPath(path) !== undefined;
  }

  /**
   * 获取 workspace 统计信息
   */
  getStats(): {
    total: number;
    primary: string | null;
    paths: string[];
  } {
    return {
      total: this.workspaces.size,
      primary: this.primaryWorkspaceId,
      paths: Array.from(this.workspaces.values()).map((w) => w.path),
    };
  }
}

/**
 * 全局 workspace 管理器实例
 */
let globalWorkspaceManager: WorkspaceManager | null = null;

/**
 * 获取全局 workspace 管理器
 */
export function getWorkspaceManager(): WorkspaceManager {
  if (!globalWorkspaceManager) {
    globalWorkspaceManager = new WorkspaceManager();
  }
  return globalWorkspaceManager;
}

/**
 * 重置全局 workspace 管理器
 */
export function resetWorkspaceManager(): void {
  globalWorkspaceManager = null;
}

/**
 * 便捷函数: 解析路径
 */
export function resolvePathInWorkspaces(path: string) {
  const manager = getWorkspaceManager();
  return manager.resolvePath(path);
}

/**
 * 便捷函数: 查找 workspace
 */
export function findWorkspaceForPath(path: string) {
  const manager = getWorkspaceManager();
  return manager.findWorkspaceByPath(path);
}
