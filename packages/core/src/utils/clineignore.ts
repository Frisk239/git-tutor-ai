// .clineignore 文件解析和管理
// 参考 Cline 的 ClineIgnoreController 实现

import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { minimatch } from "minimatch";

/**
 * .clineignore 管理器
 * 用于管理文件访问权限,防止误操作敏感文件
 */
export class ClineIgnoreManager {
  private ignorePatterns: string[] = [];
  private projectPath: string;
  private ignoreFilePath: string;

  constructor(projectPath: string) {
    this.projectPath = resolve(projectPath);
    this.ignoreFilePath = join(this.projectPath, ".clineignore");
    this.load();
  }

  /**
   * 加载 .clineignore 文件
   */
  private load(): void {
    if (!existsSync(this.ignoreFilePath)) {
      // 如果不存在 .clineignore,使用默认模式
      this.ignorePatterns = this.getDefaultIgnorePatterns();
      return;
    }

    try {
      const content = readFileSync(this.ignoreFilePath, "utf-8");
      this.ignorePatterns = this.parseIgnoreFile(content);
    } catch (error: any) {
      console.error(`Failed to load .clineignore: ${error.message}`);
      this.ignorePatterns = this.getDefaultIgnorePatterns();
    }
  }

  /**
   * 解析 .clineignore 文件内容
   */
  private parseIgnoreFile(content: string): string[] {
    const patterns: string[] = [];

    for (const line of content.split("\n")) {
      const trimmed = line.trim();

      // 跳过空行和注释
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      patterns.push(trimmed);
    }

    return patterns;
  }

  /**
   * 获取默认的忽略模式
   */
  private getDefaultIgnorePatterns(): string[] {
    return [
      // 敏感配置
      ".env",
      ".env.*",
      "*.key",
      "*.pem",
      "id_rsa*",
      ".git",

      // 依赖和构建产物
      "node_modules/**",
      "dist/**",
      "build/**",
      ".next/**",
      ".nuxt/**",
      "out/**",
      "target/**",

      // IDE 配置
      ".vscode/**",
      ".idea/**",
      "*.swp",
      "*.swo",

      // 系统文件
      ".DS_Store",
      "Thumbs.db",
      ".gitignore",
      ".clineignore",

      // 大文件
      "*.zip",
      "*.tar",
      "*.tar.gz",
      "*.rar",
      "*.7z",

      // 数据库
      "*.db",
      "*.sqlite",
      "*.sqlite3",

      // 日志
      "*.log",
      "logs/**",
    ];
  }

  /**
   * 检查路径是否被忽略
   */
  isIgnored(path: string): boolean {
    const resolvedPath = resolve(path);
    const relativePath = relative(this.projectPath, resolvedPath);

    // 标准化路径为正斜杠 (用于跨平台匹配)
    const normalizedPath = relativePath.replace(/\\/g, "/");

    for (const pattern of this.ignorePatterns) {
      if (this.matchPattern(normalizedPath, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 匹配单个模式
   */
  private matchPattern(path: string, pattern: string): boolean {
    // 处理以 / 开头的模式 (只匹配根目录)
    if (pattern.startsWith("/")) {
      const rootedPath = path.split("/")[0];
      return minimatch(rootedPath, pattern.slice(1));
    }

    // 处理以 /** 结尾的模式 (匹配目录及所有内容)
    if (pattern.endsWith("/**")) {
      const dirPattern = pattern.slice(0, -3);
      return (
        minimatch(path, dirPattern) ||
        path.startsWith(dirPattern + "/")
      );
    }

    // 处理以 /** 开头的模式 (匹配所有子目录)
    if (pattern.startsWith("/**/")) {
      const patternSuffix = pattern.slice(4);
      const parts = path.split("/");
      return parts.some((part) => minimatch(part, patternSuffix));
    }

    // 普通模式匹配
    return minimatch(path, pattern);
  }

  /**
   * 检查路径是否允许访问
   * 返回 { allowed: boolean, reason?: string }
   */
  checkAccess(path: string): { allowed: boolean; reason?: string } {
    const resolvedPath = resolve(path);

    // 检查是否在项目目录内
    const relativePath = relative(this.projectPath, resolvedPath);
    if (relativePath.startsWith("..")) {
      return {
        allowed: false,
        reason: `Path "${path}" is outside the project directory`,
      };
    }

    // 检查是否被忽略
    if (this.isIgnored(resolvedPath)) {
      return {
        allowed: false,
        reason: `Path "${path}" is ignored by .clineignore`,
      };
    }

    return { allowed: true };
  }

  /**
   * 过滤被忽略的路径
   */
  filterIgnored(paths: string[]): string[] {
    return paths.filter((path) => !this.isIgnored(path));
  }

  /**
   * 重新加载 .clineignore 文件
   */
  reload(): void {
    this.load();
  }

  /**
   * 获取所有忽略模式
   */
  getPatterns(): string[] {
    return [...this.ignorePatterns];
  }

  /**
   * 添加忽略模式
   */
  addPattern(pattern: string): void {
    if (!this.ignorePatterns.includes(pattern)) {
      this.ignorePatterns.push(pattern);
    }
  }

  /**
   * 移除忽略模式
   */
  removePattern(pattern: string): void {
    this.ignorePatterns = this.ignorePatterns.filter((p) => p !== pattern);
  }

  /**
   * 保存 .clineignore 文件
   */
  async save(): Promise<void> {
    const { writeFile } = await import("fs/promises");
    const content = this.ignorePatterns.join("\n");
    await writeFile(this.ignoreFilePath, content, "utf-8");
  }
}

/**
 * 全局 .clineignore 管理器缓存
 */
const ignoreManagerCache = new Map<string, ClineIgnoreManager>();

/**
 * 获取或创建 .clineignore 管理器
 */
export function getClineIgnoreManager(projectPath: string): ClineIgnoreManager {
  const resolvedPath = resolve(projectPath);

  if (!ignoreManagerCache.has(resolvedPath)) {
    ignoreManagerCache.set(resolvedPath, new ClineIgnoreManager(resolvedPath));
  }

  return ignoreManagerCache.get(resolvedPath)!;
}

/**
 * 清除缓存
 */
export function clearClineIgnoreCache(): void {
  ignoreManagerCache.clear();
}

/**
 * 便捷函数: 检查路径是否被忽略
 */
export function isPathIgnored(path: string, projectPath: string): boolean {
  const manager = getClineIgnoreManager(projectPath);
  return manager.isIgnored(path);
}

/**
 * 便捷函数: 检查路径访问权限
 */
export function checkPathAccess(
  path: string,
  projectPath: string
): { allowed: boolean; reason?: string } {
  const manager = getClineIgnoreManager(projectPath);
  return manager.checkAccess(path);
}
