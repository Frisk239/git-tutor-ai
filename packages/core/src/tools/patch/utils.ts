// 补丁工具函数
// 参考 Cline 的 applyDiffUtils.ts

import { PatchChunk, PeekResult } from './types.js';

/**
 * 标点符号等价映射
 * 用于模糊匹配时标准化标点符号
 *
 * 使用 Unicode 转义序列以避免编码问题
 */
const PUNCT_EQUIV: Record<string, string> = {
  '\u201C': '"', // " (LEFT DOUBLE QUOTATION MARK)
  '\u201D': '"', // " (RIGHT DOUBLE QUOTATION MARK)
  '\u201E': '"', // „ (DOUBLE LOW-9 QUOTATION MARK)
  '\u201F': '"', // ‟ (DOUBLE HIGH-REVERSED-9 QUOTATION MARK)
  '\u2019': "'", // ' (RIGHT SINGLE QUOTATION MARK)
  '\u2018': "'", // ' (LEFT SINGLE QUOTATION MARK)
  '\u201A': "'", // ‚ (SINGLE LOW-9 QUOTATION MARK)
  '\u201B': "'", // ‛ (SINGLE HIGH-REVERSED-9 QUOTATION MARK)
  '\u00AB': '\u00AB', // « (LEFT-POINTING DOUBLE ANGLE QUOTATION MARK)
  '\u00BB': '\u00BB', // » (RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK)
  '\u2039': '\u2039', // ‹ (SINGLE LEFT-POINTING ANGLE QUOTATION MARK)
  '\u203A': '\u203A', // › (SINGLE RIGHT-POINTING ANGLE QUOTATION MARK)
  '\u2014': '-', // — (EM DASH)
  '\u2013': '-', // – (EN DASH)
  '\u2010': '-', // ‐ (HYPHEN)
  '\u2212': '-', // − (MINUS SIGN)
  '\u2015': '-', // ― (HORIZONTAL BAR)
};

/**
 * 规范化字符串
 * 用于模糊匹配前的预处理
 */
export function canonicalize(s: string): string {
  // 1. NFC Unicode 规范化
  let normalized = s.normalize('NFC');

  // 2. 标准化标点符号
  normalized = normalized.replace(/./gu, (c) => PUNCT_EQUIV[c] ?? c);

  // 3. 标准化转义字符
  normalized = normalized
    .replace(/\\`/g, '`') // \` -> `
    .replace(/\\'/g, "'") // \' -> '
    .replace(/\\"/g, '"'); // \" -> "

  return normalized;
}

/**
 * 计算两个字符串的 Levenshtein 距离
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  // 初始化矩阵
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0]![j] = j;
  }

  // 填充矩阵
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2[i - 1] === str1[j - 1]) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1, // 替换
          matrix[i]![j - 1]! + 1, // 插入
          matrix[i - 1]![j]! + 1 // 删除
        );
      }
    }
  }

  return matrix[str2.length]![str1.length]!;
}

/**
 * 计算两个字符串的相似度
 * 返回 0-1 之间的值，1 表示完全相同
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(str1, str2);
  return 1.0 - distance / maxLen;
}

/**
 * 查找上下文在文件中的位置
 * 使用四层匹配策略
 */
export function findContext(
  lines: string[],
  context: string[],
  start: number,
  eof: boolean
): [number, number, number] {
  const SIMILARITY_THRESHOLD = 0.66; // 66% 相似度阈值

  let bestIndex = -1;
  let bestFuzz = 0;
  let bestSimilarity = 0.0;

  // Pass 1: 完全匹配（规范化后）
  const canonicalContext = canonicalize(context.join('\n'));
  for (let i = start; i < lines.length; i++) {
    const segment = canonicalize(lines.slice(i, i + context.length).join('\n'));
    if (segment === canonicalContext) {
      return [i, 0, 1.0]; // 完美匹配
    }
  }

  // Pass 2: 忽略尾部空格
  for (let i = start; i < lines.length; i++) {
    const segment = canonicalize(
      lines
        .slice(i, i + context.length)
        .map((s) => s.trimEnd())
        .join('\n')
    );
    const ctx = canonicalize(context.map((s) => s.trimEnd()).join('\n'));
    if (segment === ctx) {
      bestIndex = i;
      bestFuzz = 1;
      bestSimilarity = 1.0;
    }
  }

  if (bestIndex !== -1) {
    return [bestIndex, bestFuzz, bestSimilarity];
  }

  // Pass 3: 忽略所有空格
  for (let i = start; i < lines.length; i++) {
    const segment = canonicalize(
      lines
        .slice(i, i + context.length)
        .map((s) => s.trim())
        .join('\n')
    );
    const ctx = canonicalize(context.map((s) => s.trim()).join('\n'));
    if (segment === ctx) {
      bestIndex = i;
      bestFuzz = 100;
      bestSimilarity = 1.0;
    }
  }

  if (bestIndex !== -1) {
    return [bestIndex, bestFuzz, bestSimilarity];
  }

  // Pass 4: 相似度匹配
  for (let i = start; i < lines.length; i++) {
    const segment = canonicalize(lines.slice(i, i + context.length).join('\n'));
    const similarity = calculateSimilarity(segment, canonicalContext);
    if (similarity >= SIMILARITY_THRESHOLD && similarity > bestSimilarity) {
      bestIndex = i;
      bestFuzz = 1000;
      bestSimilarity = similarity;
    }
  }

  if (bestIndex !== -1) {
    return [bestIndex, bestFuzz, bestSimilarity];
  }

  return [-1, 0, bestSimilarity];
}

/**
 * Peek 函数：提取上下文
 * 从补丁行中提取原始代码和变更块
 */
export function peek(lines: string[], initialIndex: number): PeekResult {
  let index = initialIndex;
  const old: string[] = [];
  let delLines: string[] = [];
  let insLines: string[] = [];
  const chunks: PatchChunk[] = [];
  let mode: 'keep' | 'add' | 'delete' = 'keep';

  while (index < lines.length) {
    const s = lines[index]!;

    // 检查是否到达文件结束标记
    if (s.startsWith('*** End of File')) {
      break;
    }

    // 识别行类型
    let line = s;
    if (s.length > 0) {
      if (s[0] === '+') {
        mode = 'add';
      } else if (s[0] === '-') {
        mode = 'delete';
      } else if (s[0] === ' ') {
        mode = 'keep';
      } else {
        mode = 'keep';
        line = ` ${s}`; // 为上下文行添加前导空格
      }
    }

    // 移除操作符
    line = line.slice(1);

    // 收集变更行
    if (mode === 'delete') {
      delLines.push(line);
      old.push(line);
    } else if (mode === 'add') {
      insLines.push(line);
    } else {
      old.push(line);
      // 如果有待处理的删除和插入行，创建一个 chunk
      if (delLines.length > 0 || insLines.length > 0) {
        chunks.push({
          origIndex: old.length - delLines.length - 1,
          delLines: [...delLines],
          insLines: [...insLines],
        });
        delLines = [];
        insLines = [];
      }
    }

    index++;
  }

  // 处理最后一个 chunk
  if (delLines.length > 0 || insLines.length > 0) {
    chunks.push({
      origIndex: old.length - delLines.length,
      delLines: [...delLines],
      insLines: [...insLines],
    });
  }

  return { old, chunks };
}

/**
 * 保留转义字符
 * 根据原始文本的转义风格，保留新文本中的转义
 */
export function preserveEscaping(originalText: string, newText: string): string {
  // 检查原始文本的转义风格
  const hasEscapedBacktick = originalText.includes('\\`');
  const hasEscapedSingleQuote = originalText.includes("\\'");
  const hasEscapedDoubleQuote = originalText.includes('\\"');

  let result = newText;

  // 根据原始风格应用转义
  if (hasEscapedBacktick && !newText.includes('\\`')) {
    result = result.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
  }
  if (hasEscapedSingleQuote && !newText.includes("\\'")) {
    result = result.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }
  if (hasEscapedDoubleQuote && !newText.includes('\\"')) {
    result = result.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  return result;
}

/**
 * 规范化换行符
 * 将所有换行符转换为 \n
 */
export function normalizeNewlines(content: string): string {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * 分割文件为行数组
 */
export function splitLines(content: string): string[] {
  return content.split('\n');
}

/**
 * 合并行数组为文件内容
 */
export function joinLines(lines: string[]): string {
  return lines.join('\n');
}
