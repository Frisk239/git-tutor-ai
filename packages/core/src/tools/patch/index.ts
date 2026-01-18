// 补丁系统主入口
export * from "./types.js";
export * from "./utils.js";
export * from "./parser.js";
export * from "./applier.js";

// 导出便捷函数
export { parsePatch } from "./parser.js";
export { applyPatch } from "./applier.js";
export {
  canonicalize,
  levenshteinDistance,
  calculateSimilarity,
  findContext,
  peek,
  preserveEscaping,
  normalizeNewlines,
  splitLines,
  joinLines,
} from "./utils.js";
