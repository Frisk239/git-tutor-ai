// 工具执行统计
// 参考 Cline 的工具使用统计实现

import { Logger } from "../logging/logger.js";
import type { ToolDefinition, ToolResult } from "./types.js";

/**
 * 工具执行记录
 */
export interface ToolExecutionRecord {
  toolName: string;
  category: string;
  timestamp: number;
  success: boolean;
  duration?: number;
  error?: string;
  params?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * 工具执行统计
 */
export interface ToolExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  avgDuration: number;
  p95Duration: number;
  p99Duration: number;
  lastExecution?: ToolExecutionRecord;
  consecutiveFailures: number;
}

/**
 * 工具统计管理器
 */
export class ToolStatsManager {
  private logger: Logger;
  private records: Map<string, ToolExecutionRecord[]> = new Map();
  private maxRecordsPerTool = 1000;

  constructor() {
    this.logger = new Logger("ToolStatsManager");
  }

  /**
   * 记录工具执行
   */
  recordExecution(
    tool: ToolDefinition,
    result: ToolResult,
    duration?: number,
    params?: Record<string, any>
  ): void {
    const record: ToolExecutionRecord = {
      toolName: tool.name,
      category: tool.category,
      timestamp: Date.now(),
      success: result.success || false,
      duration,
      error: result.error,
      params,
      metadata: result.metadata,
    };

    // 获取或创建工具的记录列表
    let records = this.records.get(tool.name);
    if (!records) {
      records = [];
      this.records.set(tool.name, records);
    }

    // 添加记录
    records.push(record);

    // 限制记录数量
    if (records.length > this.maxRecordsPerTool) {
      records.shift();
    }

    this.logger.debug("Recorded tool execution", {
      toolName: tool.name,
      success: record.success,
      duration,
    });
  }

  /**
   * 获取工具统计
   */
  getStats(toolName?: string): ToolExecutionStats | Map<string, ToolExecutionStats> {
    if (toolName) {
      return this.calculateToolStats(toolName);
    }

    // 返回所有工具的统计
    const allStats = new Map<string, ToolExecutionStats>();
    for (const [name] of this.records) {
      allStats.set(name, this.calculateToolStats(name));
    }
    return allStats;
  }

  /**
   * 计算单个工具的统计
   */
  private calculateToolStats(toolName: string): ToolExecutionStats {
    const records = this.records.get(toolName) || [];

    if (records.length === 0) {
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        successRate: 0,
        avgDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        consecutiveFailures: 0,
      };
    }

    const successful = records.filter((r) => r.success);
    const failed = records.filter((r) => !r.success);

    const successRate = (successful.length / records.length) * 100;

    // 计算平均持续时间
    const durations = records.filter((r) => r.duration !== undefined).map((r) => r.duration as number);
    const avgDuration =
      durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0;

    // 计算百分位数
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const p95Duration = this.percentile(sortedDurations, 95);
    const p99Duration = this.percentile(sortedDurations, 99);

    // 计算连续失败次数(从最新记录开始)
    let consecutiveFailures = 0;
    for (let i = records.length - 1; i >= 0; i--) {
      if (!records[i].success) {
        consecutiveFailures++;
      } else {
        break;
      }
    }

    return {
      totalExecutions: records.length,
      successfulExecutions: successful.length,
      failedExecutions: failed.length,
      successRate,
      avgDuration: Math.round(avgDuration),
      p95Duration: Math.round(p95Duration),
      p99Duration: Math.round(p99Duration),
      lastExecution: records[records.length - 1],
      consecutiveFailures,
    };
  }

  /**
   * 计算百分位数
   */
  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const index = Math.ceil((p / 100) * arr.length) - 1;
    return arr[Math.max(0, index)];
  }

  /**
   * 获取工具执行历史
   */
  getHistory(toolName: string, limit?: number): ToolExecutionRecord[] {
    const records = this.records.get(toolName) || [];
    if (limit) {
      return records.slice(-limit);
    }
    return [...records];
  }

  /**
   * 获取最近的错误
   */
  getRecentErrors(toolName?: string, limit: number = 10): ToolExecutionRecord[] {
    const allErrors: ToolExecutionRecord[] = [];

    if (toolName) {
      const records = this.records.get(toolName) || [];
      allErrors.push(...records.filter((r) => !r.success));
    } else {
      // 获取所有工具的错误
      for (const records of this.records.values()) {
        allErrors.push(...records.filter((r) => !r.success));
      }
    }

    // 按时间倒序排序,取最近的
    return allErrors
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * 获取性能最慢的工具
   */
  getSlowestTools(limit: number = 10): Array<{
    toolName: string;
    avgDuration: number;
  }> {
    const toolStats = new Map<string, { sum: number; count: number }>();

    for (const [toolName, records] of this.records) {
      const durations = records
        .filter((r) => r.duration !== undefined)
        .map((r) => r.duration as number);

      if (durations.length > 0) {
        const sum = durations.reduce((a, b) => a + b, 0);
        toolStats.set(toolName, { sum, count: durations.length });
      }
    }

    // 转换为数组并排序
    const sorted = Array.from(toolStats.entries())
      .map(([toolName, { sum, count }]) => ({
        toolName,
        avgDuration: Math.round(sum / count),
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);

    return sorted;
  }

  /**
   * 获取成功率最低的工具
   */
  getLeastReliableTools(limit: number = 10): Array<{
    toolName: string;
    successRate: number;
    totalExecutions: number;
  }> {
    const allStats = this.getStats() as Map<string, ToolExecutionStats>;

    const sorted = Array.from(allStats.entries())
      .filter(([_, stats]) => stats.totalExecutions >= 5) // 至少执行5次
      .map(([toolName, stats]) => ({
        toolName,
        successRate: stats.successRate,
        totalExecutions: stats.totalExecutions,
      }))
      .sort((a, b) => a.successRate - b.successRate)
      .slice(0, limit);

    return sorted;
  }

  /**
   * 清除统计
   */
  clearStats(toolName?: string): void {
    if (toolName) {
      this.records.delete(toolName);
    } else {
      this.records.clear();
    }

    this.logger.info("Cleared tool stats", { toolName });
  }

  /**
   * 导出统计(用于分析和报告)
   */
  exportStats(): {
    timestamp: number;
    totalTools: number;
    totalExecutions: number;
    overallSuccessRate: number;
    toolsByCategory: Record<string, number>;
    toolStats: Record<string, ToolExecutionStats>;
  } {
    const toolStatsMap = this.getStats() as Map<string, ToolExecutionStats>;

    let totalExecutions = 0;
    let successfulExecutions = 0;

    const toolsByCategory: Record<string, number> = {};

    for (const [toolName, stats] of toolStatsMap) {
      totalExecutions += stats.totalExecutions;
      successfulExecutions += stats.successfulExecutions;

      const record = this.records.get(toolName)?.[0];
      if (record) {
        toolsByCategory[record.category] =
          (toolsByCategory[record.category] || 0) + 1;
      }
    }

    const toolStats: Record<string, ToolExecutionStats> = {};
    for (const [toolName, stats] of toolStatsMap) {
      toolStats[toolName] = stats;
    }

    return {
      timestamp: Date.now(),
      totalTools: this.records.size,
      totalExecutions,
      overallSuccessRate:
        totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
      toolsByCategory,
      toolStats,
    };
  }
}

/**
 * 全局实例
 */
export const toolStatsManager = new ToolStatsManager();
