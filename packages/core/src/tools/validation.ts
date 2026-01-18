// 工具参数验证器
// 参考 Cline 的 ToolValidator 实现

import { Logger } from '../logging/logger.js';
import type { ToolDefinition } from './types.js';

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * 扩展的工具参数定义
 */
export interface ExtendedToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
  enum?: any[];
  format?: 'file-path' | 'url' | 'email' | 'git-branch' | 'github-repo';
  // 数字范围
  minimum?: number;
  maximum?: number;
  // 字符串长度
  minLength?: number;
  maxLength?: number;
}

/**
 * 工具参数验证器
 */
export class ToolValidator {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('ToolValidator');
  }

  /**
   * 验证工具参数
   */
  validateParameters(tool: ToolDefinition, params: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. 检查必需参数
    for (const param of tool.parameters) {
      if (param.required && !(param.name in params)) {
        errors.push(`Missing required parameter: ${param.name}`);
        continue;
      }

      // 如果参数存在,进行验证
      if (param.name in params) {
        const value = params[param.name];

        // 类型检查
        const typeError = this.checkType(value, param, param.name);
        if (typeError) {
          errors.push(typeError);
        }

        // 枚举检查
        if (param.enum && !this.checkEnum(value, param.enum)) {
          errors.push(`Parameter ${param.name} must be one of: ${param.enum.join(', ')}`);
        }

        // 格式检查
        if (param.format) {
          const formatError = this.checkFormat(value, param.format, param.name);
          if (formatError) {
            errors.push(formatError);
          }
        }

        // 范围检查(针对数字)
        if (param.type === 'number') {
          const rangeError = this.checkRange(value, param as ExtendedToolParameter, param.name);
          if (rangeError) {
            errors.push(rangeError);
          }
        }

        // 字符串长度检查
        if (param.type === 'string') {
          const lengthError = this.checkStringLength(
            value,
            param as ExtendedToolParameter,
            param.name
          );
          if (lengthError) {
            errors.push(lengthError);
          }
        }
      }
    }

    // 2. 检查是否有未知的参数
    const validParamNames = new Set(tool.parameters.map((p) => p.name));
    const unknownParams = Object.keys(params).filter((key) => !validParamNames.has(key));

    if (unknownParams.length > 0) {
      warnings.push(`Unknown parameters provided: ${unknownParams.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证工具可用性
   */
  async validateAvailability(
    tool: ToolDefinition,
    context: any
  ): Promise<{ available: boolean; reason?: string }> {
    // 检查工具是否启用
    if (!tool.enabled) {
      return {
        available: false,
        reason: `Tool ${tool.name} is disabled`,
      };
    }

    // 检查环境依赖
    if (tool.category === 'browser') {
      // TODO: 检查浏览器环境
    }

    if (tool.category === 'git' || tool.category === 'github') {
      // TODO: 检查 Git 仓库
      const hasGit = context.services.git;
      if (!hasGit) {
        return {
          available: false,
          reason: 'Git service not available',
        };
      }
    }

    if (tool.category === 'github') {
      // TODO: 检查 GitHub 配置
      const hasGitHub = context.services.github;
      if (!hasGitHub) {
        return {
          available: false,
          reason: 'GitHub service not available',
        };
      }
    }

    return { available: true };
  }

  /**
   * 检查参数类型
   */
  private checkType(value: any, param: any, paramName: string): string | null {
    switch (param.type) {
      case 'string':
        if (typeof value !== 'string') {
          return `Parameter ${paramName} must be of type string, got ${typeof value}`;
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return `Parameter ${paramName} must be of type number, got ${typeof value}`;
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return `Parameter ${paramName} must be of type boolean, got ${typeof value}`;
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return `Parameter ${paramName} must be of type array, got ${typeof value}`;
        }
        break;

      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return `Parameter ${paramName} must be of type object, got ${typeof value}`;
        }
        break;
    }

    return null;
  }

  /**
   * 检查枚举值
   */
  private checkEnum(value: any, enumValues: any[]): boolean {
    return enumValues.includes(value);
  }

  /**
   * 检查参数格式
   */
  private checkFormat(value: any, format: string, paramName: string): string | null {
    if (typeof value !== 'string') {
      return null; // 类型检查会处理
    }

    switch (format) {
      case 'file-path':
        // 文件路径格式检查
        if (value.includes('\0')) {
          return `Parameter ${paramName} contains null character`;
        }
        if (value.length > 4096) {
          return `Parameter ${paramName} is too long (max 4096 characters)`;
        }
        // 检查是否包含无效字符
        if (/[<>:"|?*]/.test(value)) {
          return `Parameter ${paramName} contains invalid characters`;
        }
        break;

      case 'url':
        // URL 格式检查
        try {
          new URL(value);
        } catch {
          return `Parameter ${paramName} must be a valid URL`;
        }
        break;

      case 'email':
        // Email 格式检查
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return `Parameter ${paramName} must be a valid email address`;
        }
        break;

      case 'git-branch':
        // Git 分支名格式检查
        if (!/^[a-zA-Z0-9\-_\/\.]+$/.test(value)) {
          return `Parameter ${paramName} contains invalid characters for a git branch`;
        }
        if (value.startsWith('-')) {
          return `Parameter ${paramName} cannot start with a dash`;
        }
        break;

      case 'github-repo':
        // GitHub 仓库格式检查 (owner/repo)
        if (!/^[\w\-\.]+\/[\w\-\.]+$/.test(value)) {
          return `Parameter ${paramName} must be in format "owner/repo"`;
        }
        break;

      default:
        // 未知格式,跳过检查
        break;
    }

    return null;
  }

  /**
   * 检查数字范围
   */
  private checkRange(
    value: number,
    param: ExtendedToolParameter,
    paramName: string
  ): string | null {
    if (param.minimum !== undefined && value < param.minimum) {
      return `Parameter ${paramName} must be >= ${param.minimum}, got ${value}`;
    }

    if (param.maximum !== undefined && value > param.maximum) {
      return `Parameter ${paramName} must be <= ${param.maximum}, got ${value}`;
    }

    return null;
  }

  /**
   * 检查字符串长度
   */
  private checkStringLength(
    value: string,
    param: ExtendedToolParameter,
    paramName: string
  ): string | null {
    if (param.minLength !== undefined && value.length < param.minLength) {
      return `Parameter ${paramName} must be at least ${param.minLength} characters`;
    }

    if (param.maxLength !== undefined && value.length > param.maxLength) {
      return `Parameter ${paramName} must be at most ${param.maxLength} characters`;
    }

    return null;
  }
}

/**
 * 全局验证器实例
 */
export const toolValidator = new ToolValidator();
