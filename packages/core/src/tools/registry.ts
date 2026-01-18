// 工具注册表实现
import type { ToolDefinition, ToolRegistry, ToolCategory } from './types.js';

/**
 * 工具注册表实现
 */
export class ToolRegistryImpl implements ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private categoryIndex: Map<ToolCategory, Set<string>> = new Map();

  /**
   * 注册工具
   */
  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} is already registered`);
    }

    this.tools.set(tool.name, tool);

    // 更新类别索引
    if (!this.categoryIndex.has(tool.category)) {
      this.categoryIndex.set(tool.category, new Set());
    }
    this.categoryIndex.get(tool.category)!.add(tool.name);
  }

  /**
   * 批量注册
   */
  registerAll(tools: ToolDefinition[]): void {
    tools.forEach((tool) => this.register(tool));
  }

  /**
   * 取消注册工具
   */
  unregister(toolName: string): void {
    const tool = this.tools.get(toolName);
    if (!tool) return;

    this.tools.delete(toolName);

    // 更新类别索引
    const categoryTools = this.categoryIndex.get(tool.category);
    if (categoryTools) {
      categoryTools.delete(toolName);
      if (categoryTools.size === 0) {
        this.categoryIndex.delete(tool.category);
      }
    }
  }

  /**
   * 获取工具
   */
  get(toolName: string): ToolDefinition | undefined {
    return this.tools.get(toolName);
  }

  /**
   * 获取所有工具
   */
  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * 按类别获取工具
   */
  getByCategory(category: ToolCategory): ToolDefinition[] {
    const toolNames = this.categoryIndex.get(category);
    if (!toolNames) return [];

    return Array.from(toolNames)
      .map((name) => this.tools.get(name))
      .filter((tool): tool is ToolDefinition => tool !== undefined);
  }

  /**
   * 搜索工具
   */
  search(query: string): ToolDefinition[] {
    const lowerQuery = query.toLowerCase();

    return Array.from(this.tools.values()).filter(
      (tool) =>
        tool.name.toLowerCase().includes(lowerQuery) ||
        tool.displayName.toLowerCase().includes(lowerQuery) ||
        tool.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 检查工具是否存在
   */
  has(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * 获取所有类别
   */
  getCategories(): ToolCategory[] {
    return Array.from(this.categoryIndex.keys());
  }

  /**
   * 清空注册表
   */
  clear(): void {
    this.tools.clear();
    this.categoryIndex.clear();
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number;
    byCategory: Record<string, number>;
    enabled: number;
    disabled: number;
    experimental: number;
  } {
    const tools = this.getAll();
    const byCategory: Record<string, number> = {};

    tools.forEach((tool) => {
      byCategory[tool.category] = (byCategory[tool.category] || 0) + 1;
    });

    return {
      total: tools.length,
      byCategory,
      enabled: tools.filter((t) => t.enabled).length,
      disabled: tools.filter((t) => !t.enabled).length,
      experimental: tools.filter((t) => t.experimental).length,
    };
  }
}

/**
 * 导出单例实例
 */
export const toolRegistry = new ToolRegistryImpl();
