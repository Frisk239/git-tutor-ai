/**
 * AI Agent 工厂函数
 */

import { AIProvider } from '@git-tutor/shared';
import { AIAgent } from './agent.js';
import type { AgentConfig } from './agent.js';
import { DEFAULT_SYSTEM_PROMPT, COMPACT_SYSTEM_PROMPT } from './prompts.js';

/**
 * 创建 AI Agent
 */
export function createAgent(config: AgentConfig): AIAgent {
  return new AIAgent(config);
}

/**
 * 创建默认配置的 AI Agent
 */
export function createDefaultAgent(options: {
  provider?: AIProvider;
  model?: string;
  workingDirectory?: string;
  sessionId?: string;
  userId?: string;
  systemPrompt?: string;
  useCompactPrompt?: boolean;
}): AIAgent {
  const config: AgentConfig = {
    provider: options.provider || AIProvider.ANTHROPIC,
    model: options.model || 'claude-sonnet-4-5-20250929',
    workingDirectory: options.workingDirectory || process.cwd(),
    sessionId: options.sessionId || 'default',
    userId: options.userId || 'anonymous',
    systemPrompt:
      options.systemPrompt ||
      (options.useCompactPrompt ? COMPACT_SYSTEM_PROMPT : DEFAULT_SYSTEM_PROMPT),
    maxTurns: 10,
  };

  return new AIAgent(config);
}

/**
 * 创建紧凑版 Agent（用于上下文较小的模型）
 */
export function createCompactAgent(options: {
  provider?: AIProvider;
  model?: string;
  workingDirectory?: string;
  sessionId?: string;
  userId?: string;
}): AIAgent {
  return createDefaultAgent({
    ...options,
    useCompactPrompt: true,
  });
}
