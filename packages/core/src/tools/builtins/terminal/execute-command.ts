/**
 * EXECUTE_COMMAND 工具
 * 在终端中执行命令，支持跨平台（Windows/macOS/Linux）
 * 参考 Cline 实现：cline/src/integrations/terminal/standalone/StandaloneTerminalProcess.ts
 * 简化版：移除 VSCode 特定功能、后台命令跟踪、终端复用等
 */

import type { ToolDefinition, ToolContext, ToolResult } from "../../types.js";
import { ToolPermission } from "@git-tutor/shared";
import { toolRegistry } from "../../registry.js";
import { spawn } from "child_process";
import { EventEmitter } from "events";

/**
 * 命令执行结果
 */
export interface CommandResult {
  /** 命令字符串 */
  command: string;
  /** 工作目录 */
  cwd: string;
  /** 标准输出 */
  stdout: string;
  /** 标准错误 */
  stderr: string;
  /** 退出码 */
  exitCode: number | null;
  /** 是否成功 */
  success: boolean;
  /** 执行时长（毫秒） */
  duration: number;
}

/**
 * 工具参数
 */
interface ExecuteCommandParams {
  /** 要执行的命令 */
  command: string;
  /** 工作目录（可选，默认：当前目录） */
  cwd?: string;
  /** 超时时间（秒，可选，默认：120） */
  timeout?: number;
  /** 环境变量（可选） */
  env?: Record<string, string>;
}

/**
 * 命令执行器
 * 简化版的 StandaloneTerminalProcess
 */
class CommandExecutor extends EventEmitter {
  /** 完整输出缓冲区 */
  private fullOutput: string = "";

  /** 错误输出缓冲区 */
  private fullError: string = "";

  /** 不完整行的缓冲区 */
  private buffer: string = "";

  /** 子进程 */
  private childProcess: ReturnType<typeof spawn> | null = null;

  /** 退出码 */
  private exitCode: number | null = null;

  /** 是否已完成 */
  private isCompleted: boolean = false;

  /** 是否被取消 */
  private isCancelled: boolean = false;

  /**
   * 执行命令
   * @param command 命令字符串
   * @param options 执行选项
   * @returns Promise<CommandResult>
   */
  async execute(
    command: string,
    options: {
      cwd?: string;
      timeout?: number;
      env?: Record<string, string>;
    } = {}
  ): Promise<CommandResult> {
    const startTime = Date.now();
    const { cwd = process.cwd(), timeout = 120, env = {} } = options;

    return new Promise((resolve, reject) => {
      try {
        // 获取默认 shell
        const shell = this.getDefaultShell();
        const shellArgs = this.getShellArgs(shell, command);

        // 准备环境变量
        const execEnv: NodeJS.ProcessEnv = {
          ...process.env,
          TERM: "xterm-256color",
          PAGER: "cat", // 防止 less 分页器
          GIT_PAGER: "cat", // 防止 git 使用分页器
          SYSTEMD_PAGER: "",
          MANPAGER: "cat",
          ...env,
        };

        // 创建 shell 选项
        const shellOptions: {
          cwd: string;
          stdio: ["pipe", "pipe", "pipe"];
          env: NodeJS.ProcessEnv;
          shell?: boolean;
          detached?: boolean;
        } = {
          cwd: cwd,
          stdio: ["pipe", "pipe", "pipe"],
          env: execEnv,
        };

        // Windows cmd.exe 特殊处理
        if (process.platform === "win32" && shell.toLowerCase().includes("cmd")) {
          shellOptions.shell = true;
          this.childProcess = spawn("cmd.exe", shellArgs, shellOptions);
        } else {
          // Unix-like 系统：使用 detached 创建进程组（便于终止整个进程树）
          shellOptions.detached = true;
          this.childProcess = spawn(shell, shellArgs, shellOptions);
        }

        let timeoutHandle: NodeJS.Timeout | undefined;

        // 设置超时
        if (timeout > 0) {
          timeoutHandle = setTimeout(() => {
            this.terminate().then(() => {
              this.isCancelled = true;
              resolve({
                command,
                cwd,
                stdout: this.fullOutput,
                stderr: this.fullError,
                exitCode: -1,
                success: false,
                duration: Date.now() - startTime,
              });
            });
          }, timeout * 1000);
        }

        // 处理 stdout
        this.childProcess.stdout?.on("data", (data: Buffer) => {
          const output = data.toString();
          this.fullOutput += output;
          this.handleOutput(output);
        });

        // 处理 stderr
        this.childProcess.stderr?.on("data", (data: Buffer) => {
          const error = data.toString();
          this.fullError += error;
          this.handleOutput(error);
        });

        // 处理进程完成
        this.childProcess.on("close", (code: number | null) => {
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }

          this.exitCode = code;
          this.isCompleted = true;
          this.emitRemainingBuffer();

          resolve({
            command,
            cwd,
            stdout: this.fullOutput,
            stderr: this.fullError,
            exitCode: code,
            success: code === 0,
            duration: Date.now() - startTime,
          });
        });

        // 处理错误
        this.childProcess.on("error", (error: Error) => {
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 处理输出，按行分割并发出事件
   * @param data 输出数据
   */
  private handleOutput(data: string): void {
    this.buffer += data;
    let lineEndIndex: number;

    while ((lineEndIndex = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, lineEndIndex).trimEnd();
      this.emit("line", line);
      this.buffer = this.buffer.slice(lineEndIndex + 1);
    }
  }

  /**
   * 发出缓冲区中剩余的内容
   */
  private emitRemainingBuffer(): void {
    if (this.buffer) {
      const remainingBuffer = this.removeShellPromptArtifacts(this.buffer);
      if (remainingBuffer) {
        this.emit("line", remainingBuffer);
      }
      this.buffer = "";
    }
  }

  /**
   * 移除 shell 提示符残留
   * @param output 输出字符串
   * @returns 清理后的输出
   */
  private removeShellPromptArtifacts(output: string): string {
    const lines = output.trimEnd().split("\n");
    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      // 移除常见的 shell 提示符结尾：%, $, #, >
      lines[lines.length - 1] = lastLine.replace(/[%$#>]\s*$/, "");
    }
    return lines.join("\n").trimEnd();
  }

  /**
   * 获取默认 shell
   * @returns shell 路径
   */
  private getDefaultShell(): string {
    if (process.platform === "win32") {
      return process.env.COMSPEC || "cmd.exe";
    } else {
      return process.env.SHELL || "/bin/bash";
    }
  }

  /**
   * 获取 shell 参数
   * @param shell shell 路径
   * @param command 命令字符串
   * @returns shell 参数数组
   */
  private getShellArgs(shell: string, command: string): string[] {
    if (process.platform === "win32") {
      if (shell.toLowerCase().includes("powershell") || shell.toLowerCase().includes("pwsh")) {
        return ["-Command", command];
      } else {
        return ["/c", command];
      }
    } else {
      // Unix-like 系统：使用 -l (login) 和 -c (command)
      return ["-l", "-c", command];
    }
  }

  /**
   * 终止进程
   * 使用 SIGTERM 优雅终止，如果失败则使用 SIGKILL
   */
  async terminate(): Promise<void> {
    if (!this.childProcess || this.isCompleted) {
      return;
    }

    const pid = this.childProcess.pid;
    if (!pid) {
      this.childProcess.kill("SIGTERM");
      return;
    }

    try {
      // Windows: 直接杀进程
      if (process.platform === "win32") {
        this.childProcess.kill("SIGKILL");
      } else {
        // Unix: 首先尝试 SIGTERM，然后 SIGKILL
        this.childProcess.kill("SIGTERM");

        // 2 秒后如果还没退出，使用 SIGKILL
        setTimeout(() => {
          if (this.childProcess && !this.isCompleted) {
            this.childProcess.kill("SIGKILL");
          }
        }, 2000);
      }
    } catch (error) {
      // 忽略错误
    }
  }
}

/**
 * EXECUTE_COMMAND 工具定义
 */
const executeCommandTool: ToolDefinition = {
  name: "execute_command",
  displayName: "执行命令",
  description:
    "在终端中执行命令。支持跨平台（Windows/macOS/Linux）。适用于运行 Git 命令、安装依赖、运行测试、构建项目等场景。",
  category: "terminal",
  parameters: [
    {
      name: "command",
      type: "string",
      description: "要执行的命令（例如：'npm install', 'git status', 'ls -la'）",
      required: true,
    },
    {
      name: "cwd",
      type: "string",
      description: "工作目录（可选，默认：当前目录）",
      required: false,
    },
    {
      name: "timeout",
      type: "number",
      description: "超时时间，单位秒（可选，默认：120）",
      required: false,
    },
    {
      name: "env",
      type: "object",
      description: "环境变量（可选）",
      required: false,
    },
  ],
  permissions: [ToolPermission.EXECUTE],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    const executor = new CommandExecutor();

    try {
      const { command, cwd, timeout, env } = params as ExecuteCommandParams;

      // 参数验证
      if (!command || typeof command !== "string") {
        return {
          success: false,
          error: "参数 'command' 必须是非空字符串",
        };
      }

      // 执行命令
      const result = await executor.execute(command, { cwd, timeout, env });

      // 组合输出
      const output = [result.stdout, result.stderr].filter(Boolean).join("\n");

      return {
        success: true,
        data: {
          ...result,
          output,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * 注册 EXECUTE_COMMAND 工具
 */
export function registerExecuteCommandTool(): void {
  toolRegistry.register(executeCommandTool);
}

// 自动注册
registerExecuteCommandTool();
