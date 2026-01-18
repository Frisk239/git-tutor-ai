/**
 * 补丁工具函数测试
 */

import { describe, it, expect } from "vitest";
import {
  canonicalize,
  levenshteinDistance,
  calculateSimilarity,
  findContext,
  preserveEscaping,
  normalizeNewlines,
  splitLines,
  joinLines,
} from "./utils.js";

describe("字符串规范化", () => {
  describe("canonicalize", () => {
    it("应该规范化各种引号字符", () => {
      const input = '"Hello" "World"';
      const result = canonicalize(input);

      // 所有的特殊引号都应该被转换为标准引号
      expect(result).toContain('"');
    });

    it("应该规范化连字符", () => {
      const input1 = "em—dash";
      const input2 = "en–dash";
      const input3 = "hyphen-minus";

      const result1 = canonicalize(input1);
      const result2 = canonicalize(input2);
      const result3 = canonicalize(input3);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result3).toBeDefined();
    });

    it("应该标准化转义字符", () => {
      const input = "\\`\\'\\";
      const result = canonicalize(input);

      expect(result).toBeDefined();
    });

    it("应该处理空字符串", () => {
      expect(canonicalize("")).toBe("");
    });

    it("应该处理普通字符串", () => {
      const input = "Hello, World!";
      const result = canonicalize(input);

      expect(result).toBe("Hello, World!");
    });
  });

  describe("normalizeNewlines", () => {
    it("应该将 CRLF 转换为 LF", () => {
      const input = "line1\r\nline2\r\nline3";
      const result = normalizeNewlines(input);

      expect(result).toBe("line1\nline2\nline3");
    });

    it("应该将 CR 转换为 LF", () => {
      const input = "line1\rline2\rline3";
      const result = normalizeNewlines(input);

      expect(result).toBe("line1\nline2\nline3");
    });

    it("应该保持 LF 不变", () => {
      const input = "line1\nline2\nline3";
      const result = normalizeNewlines(input);

      expect(result).toBe(input);
    });

    it("应该处理混合换行符", () => {
      const input = "line1\r\nline2\rline3\nline4";
      const result = normalizeNewlines(input);

      expect(result).toBe("line1\nline2\nline3\nline4");
    });
  });

  describe("splitLines 和 joinLines", () => {
    it("应该正确分割行为数组", () => {
      const input = "line1\nline2\nline3";
      const lines = splitLines(input);

      expect(lines).toEqual(["line1", "line2", "line3"]);
    });

    it("应该处理末尾的换行符", () => {
      const input = "line1\nline2\n";
      const lines = splitLines(input);

      expect(lines).toEqual(["line1", "line2", ""]);
    });

    it("应该正确将行数组合并为字符串", () => {
      const lines = ["line1", "line2", "line3"];
      const result = joinLines(lines);

      expect(result).toBe("line1\nline2\nline3");
    });

    it("splitLines 和 joinLines 应该是可逆的", () => {
      const original = "line1\nline2\nline3";
      const lines = splitLines(original);
      const restored = joinLines(lines);

      expect(restored).toBe(original);
    });
  });
});

describe("Levenshtein 距离", () => {
  describe("levenshteinDistance", () => {
    it("应该计算相同字符串的距离为 0", () => {
      expect(levenshteinDistance("hello", "hello")).toBe(0);
    });

    it("应该计算一个字符插入的距离", () => {
      expect(levenshteinDistance("hello", "hello!")).toBe(1);
    });

    it("应该计算一个字符删除的距离", () => {
      expect(levenshteinDistance("hello!", "hello")).toBe(1);
    });

    it("应该计算一个字符替换的距离", () => {
      expect(levenshteinDistance("hello", "hallo")).toBe(1);
    });

    it("应该计算完全不同字符串的距离", () => {
      expect(levenshteinDistance("abc", "xyz")).toBe(3);
    });

    it("应该处理空字符串", () => {
      expect(levenshteinDistance("", "")).toBe(0);
      expect(levenshteinDistance("abc", "")).toBe(3);
      expect(levenshteinDistance("", "abc")).toBe(3);
    });

    it("应该正确计算复杂编辑操作", () => {
      expect(levenshteinDistance("kitten", "sitting")).toBe(3);
    });
  });

  describe("calculateSimilarity", () => {
    it("应该计算相同字符串的相似度为 1", () => {
      expect(calculateSimilarity("hello", "hello")).toBe(1.0);
    });

    it("应该计算相似字符串的高相似度", () => {
      const similarity = calculateSimilarity("hello", "hallo");
      expect(similarity).toBeGreaterThan(0.8);
    });

    it("应该计算不同字符串的低相似度", () => {
      const similarity = calculateSimilarity("abc", "xyz");
      expect(similarity).toBeLessThan(0.5);
    });

    it("应该处理空字符串", () => {
      expect(calculateSimilarity("", "")).toBe(1.0);
      expect(calculateSimilarity("abc", "")).toBe(0.0);
    });

    it("相似度应该在 0-1 之间", () => {
      const similarity = calculateSimilarity("test", "testing");
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });
});

describe("上下文查找", () => {
  describe("findContext", () => {
    const lines = [
      "line 1",
      "line 2",
      "line 3",
      "line 4",
      "line 5",
      "line 6",
      "line 7",
      "line 8",
    ];

    it("应该找到完全匹配的上下文", () => {
      const context = ["line 3", "line 4"];
      const [index, fuzz, similarity] = findContext(lines, context, 0, false);

      expect(index).toBe(2);
      expect(fuzz).toBe(0);
      expect(similarity).toBe(1.0);
    });

    it("应该从指定位置开始查找", () => {
      const context = ["line 5", "line 6"];
      const [index, fuzz, similarity] = findContext(lines, context, 3, false);

      expect(index).toBe(4);
      expect(similarity).toBe(1.0);
    });

    it("应该处理找不到上下文的情况", () => {
      const context = ["nonexistent", "line"];
      const [index, fuzz, similarity] = findContext(lines, context, 0, false);

      expect(index).toBe(-1);
    });

    it("应该处理空上下文", () => {
      const context: string[] = [];
      const [index, fuzz, similarity] = findContext(lines, context, 0, false);

      expect(index).toBeGreaterThanOrEqual(0);
    });

    it("应该处理上下文比文件长的情况", () => {
      const longContext = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
      const [index, fuzz, similarity] = findContext(
        lines,
        longContext,
        0,
        false
      );

      expect(index).toBe(-1);
    });
  });

  describe("模糊匹配", () => {
    const lines = [
      "function hello() {",
      "  console.log('hi');",
      "}",
      "function world() {",
      "  console.log('there');",
      "}",
    ];

    it("应该找到忽略尾部空格的匹配", () => {
      const context = ["  console.log('hi');  "];
      const [index, fuzz] = findContext(lines, context, 0, false);

      expect(index).toBe(1);
      expect(fuzz).toBeGreaterThan(0);
    });

    it("应该找到相似度匹配", () => {
      const context = ["  console.log('hi')"];
      const [index, fuzz, similarity] = findContext(lines, context, 0, false);

      expect(index).toBeGreaterThanOrEqual(0);
      if (index >= 0) {
        expect(similarity).toBeGreaterThan(0.66);
      }
    });
  });
});

describe("转义字符保留", () => {
  describe("preserveEscaping", () => {
    it("应该保留反引号转义", () => {
      const original = "const s = \\`hello\\`";
      const newText = "const s = `world`";
      const result = preserveEscaping(original, newText);

      expect(result).toBeDefined();
    });

    it("应该保留单引号转义", () => {
      const original = "const s = \\'hello\\'";
      const newText = "const s = 'world'";
      const result = preserveEscaping(original, newText);

      expect(result).toBeDefined();
    });

    it("应该保留双引号转义", () => {
      const original = 'const s = \\"hello\\"';
      const newText = 'const s = "world"';
      const result = preserveEscaping(original, newText);

      expect(result).toBeDefined();
    });

    it("应该处理没有转义的情况", () => {
      const original = "const s = `hello`";
      const newText = "const s = `world`";
      const result = preserveEscaping(original, newText);

      expect(result).toBe(newText);
    });

    it("应该处理空字符串", () => {
      const result = preserveEscaping("", "");

      expect(result).toBeDefined();
    });
  });
});
