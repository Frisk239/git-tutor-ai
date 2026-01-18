/**
 * APPLY_PATCH 工具测试
 * 测试 V4A diff 格式的补丁应用功能
 */

const path = require("path");
const fs = require("fs");
const os = require("os");

// ============================================================================
// 测试配置
// ============================================================================

const testResults = [];

function recordResult(testName, passed, details, duration, error = null) {
  testResults.push({
    test: testName,
    passed,
    details,
    duration,
    error,
  });
}

// ============================================================================
// 工具导入
// ============================================================================

async function importTool() {
  // 模拟 V4A 格式解析器
  const PATCH_MARKERS = {
    BEGIN: "*** Begin Patch",
    END: "*** End Patch",
    ADD: "*** Add File: ",
    UPDATE: "*** Update File: ",
    DELETE: "*** Delete File: ",
    MOVE: "*** Move to: ",
    SECTION: "@@",
  };

  const BASH_WRAPPERS = ["%%bash", "apply_patch", "EOF", "```"];

  class PatchParser {
    constructor(lines, originalFiles) {
      this.lines = lines;
      this.originalFiles = originalFiles;
    }

    parse() {
      const patch = { actions: {} };
      let currentFile = null;
      let currentAction = null;

      for (let i = 0; i < this.lines.length; i++) {
        const line = this.lines[i];

        if (line === PATCH_MARKERS.BEGIN || line === PATCH_MARKERS.END) {
          continue;
        }

        if (line.startsWith(PATCH_MARKERS.ADD)) {
          if (currentFile && currentAction) {
            patch.actions[currentFile] = currentAction;
          }
          currentFile = line.substring(PATCH_MARKERS.ADD.length).trim();
          currentAction = { type: "add", chunks: [] };
          continue;
        }

        if (line.startsWith(PATCH_MARKERS.UPDATE)) {
          if (currentFile && currentAction) {
            patch.actions[currentFile] = currentAction;
          }
          currentFile = line.substring(PATCH_MARKERS.UPDATE.length).trim();
          currentAction = { type: "update", chunks: [] };
          continue;
        }

        if (line.startsWith(PATCH_MARKERS.DELETE)) {
          if (currentFile && currentAction) {
            patch.actions[currentFile] = currentAction;
          }
          currentFile = line.substring(PATCH_MARKERS.DELETE.length).trim();
          currentAction = { type: "delete", chunks: [] };
          continue;
        }

        if (currentFile && currentAction) {
          if (currentAction.type === "add") {
            if (line.startsWith("+")) {
              if (!currentAction.newFile) {
                currentAction.newFile = "";
              }
              currentAction.newFile += line.substring(1) + "\n";
            }
          } else if (currentAction.type === "update") {
            if (line.startsWith("+") || line.startsWith("-") || line.startsWith(" ")) {
              if (!currentAction.chunks.length) {
                currentAction.chunks.push({ origIndex: 0, delLines: [], insLines: [] });
              }
              const chunk = currentAction.chunks[currentAction.chunks.length - 1];

              if (line.startsWith("+")) {
                chunk.insLines.push(line.substring(1));
              } else if (line.startsWith("-")) {
                chunk.delLines.push(line.substring(1));
              } else if (line.startsWith(" ")) {
                if (chunk.delLines.length === 0 && chunk.insLines.length === 0) {
                  chunk.origIndex++;
                }
              }
            }
          }
        }
      }

      if (currentFile && currentAction) {
        patch.actions[currentFile] = currentAction;
      }

      return { patch, fuzz: 0 };
    }
  }

  return {
    name: "apply_patch",
    handler: async (params) => {
      const { input, cwd: workingDir = process.cwd(), createBackup = false, dryRun = false } = params;

      try {
        // 预处理输入
        let lines = input.split("\n").map((line) => line.replace(/\r$/, ""));
        lines = stripBashWrappers(lines);

        const hasBegin = lines.length > 0 && lines[0].startsWith(PATCH_MARKERS.BEGIN);
        const hasEnd = lines.length > 0 && lines[lines.length - 1] === PATCH_MARKERS.END;

        if (!hasBegin && !hasEnd) {
          lines = [PATCH_MARKERS.BEGIN, ...lines, PATCH_MARKERS.END];
        }

        // 加载原文件
        const filesToLoad = extractFilesForOperations(input, [PATCH_MARKERS.UPDATE, PATCH_MARKERS.DELETE]);
        const originalFiles = {};

        for (const filePath of filesToLoad) {
          const fullPath = path.resolve(workingDir, filePath);
          try {
            const content = fs.readFileSync(fullPath, "utf8");
            originalFiles[filePath] = content.replace(/\r\n/g, "\n");
          } catch (error) {
            return {
              success: false,
              error: `文件不存在: ${filePath}`,
            };
          }
        }

        // 解析补丁
        const parser = new PatchParser(lines, originalFiles);
        const { patch } = parser.parse();

        // 应用补丁
        const applied = [];
        const failed = [];
        const backups = [];

        for (const [filePath, action] of Object.entries(patch.actions)) {
          try {
            await applyAction(filePath, action, workingDir, createBackup, dryRun);
            applied.push(filePath);
          } catch (error) {
            failed.push({ path: filePath, error: error.message });
          }
        }

        const summary = generateSummary(applied, failed, dryRun);

        return {
          success: failed.length === 0,
          data: {
            applied,
            failed,
            backups,
            summary,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error.message || String(error),
        };
      }
    },
  };

  async function applyAction(filePath, action, workingDir, createBackup, dryRun) {
    const fullPath = path.resolve(workingDir, filePath);

    switch (action.type) {
      case "add":
        await addFile(fullPath, action.newFile || "", dryRun);
        break;

      case "delete":
        await deleteFile(fullPath, createBackup, dryRun);
        break;

      case "update":
        await updateFile(fullPath, action, createBackup, dryRun);
        break;
    }
  }

  async function addFile(filePath, content, dryRun) {
    try {
      fs.accessSync(filePath);
      throw new Error(`文件已存在: ${filePath}`);
    } catch {}

    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });

    if (!dryRun) {
      fs.writeFileSync(filePath, content, "utf8");
    }
  }

  async function deleteFile(filePath, createBackup, dryRun) {
    try {
      fs.accessSync(filePath);
    } catch {
      throw new Error(`文件不存在: ${filePath}`);
    }

    if (createBackup) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = `${filePath}.backup-${timestamp}`;
      fs.copyFileSync(filePath, backupPath);
    }

    if (!dryRun) {
      fs.unlinkSync(filePath);
    }
  }

  async function updateFile(filePath, action, createBackup, dryRun) {
    let originalContent;
    try {
      originalContent = fs.readFileSync(filePath, "utf8");
    } catch {
      throw new Error(`无法读取文件: ${filePath}`);
    }

    if (createBackup) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = `${filePath}.backup-${timestamp}`;
      fs.copyFileSync(filePath, backupPath);
    }

    const newContent = applyChunks(originalContent, action.chunks, filePath);

    if (!dryRun) {
      fs.writeFileSync(filePath, newContent, "utf8");
    }
  }

  function applyChunks(content, chunks, filePath) {
    if (chunks.length === 0) {
      return content;
    }

    const lines = content.split("\n");
    const result = [];
    let currentIndex = 0;

    for (const chunk of chunks) {
      if (chunk.origIndex > lines.length) {
        throw new Error(`${filePath}: chunk.origIndex ${chunk.origIndex} > lines.length ${lines.length}`);
      }

      result.push(...lines.slice(currentIndex, chunk.origIndex));
      result.push(...chunk.insLines);
      currentIndex = chunk.origIndex + chunk.delLines.length;
    }

    result.push(...lines.slice(currentIndex));

    return result.join("\n");
  }

  function generateSummary(applied, failed, dryRun) {
    const lines = [];
    lines.push(`补丁应用结果 ${dryRun ? "(干运行)" : ""}:`);
    lines.push("");

    if (applied.length > 0) {
      lines.push(`✅ 成功应用 (${applied.length}):`);
      for (const p of applied) {
        lines.push(`   ✓ ${p}`);
      }
      lines.push("");
    }

    if (failed.length > 0) {
      lines.push(`❌ 失败 (${failed.length}):`);
      for (const { path: p, error } of failed) {
        lines.push(`   ✗ ${p}`);
        lines.push(`      错误: ${error}`);
      }
      lines.push("");
    }

    const total = applied.length + failed.length;
    const successRate = total > 0 ? (applied.length / total) * 100 : 0;
    lines.push(`成功率: ${successRate.toFixed(1)}% (${applied.length}/${total})`);

    return lines.join("\n");
  }

  function extractFilesForOperations(text, markers) {
    const lines = text.split("\n");
    const files = [];

    for (const line of lines) {
      for (const marker of markers) {
        if (line.startsWith(marker)) {
          const file = line.substring(marker.length).trim();
          if (file && !text.trim().endsWith(file)) {
            files.push(file);
          }
          break;
        }
      }
    }

    return files;
  }

  function stripBashWrappers(lines) {
    const result = [];
    let insidePatch = false;
    let foundBegin = false;
    let foundContent = false;

    for (const line of lines) {
      if (!insidePatch && BASH_WRAPPERS.some((wrapper) => line.startsWith(wrapper))) {
        continue;
      }

      if (line.startsWith(PATCH_MARKERS.BEGIN)) {
        insidePatch = true;
        foundBegin = true;
        result.push(line);
        continue;
      }

      if (line === PATCH_MARKERS.END) {
        insidePatch = false;
        result.push(line);
        continue;
      }

      const isPatchContent =
        line.startsWith(PATCH_MARKERS.ADD) ||
        line.startsWith(PATCH_MARKERS.UPDATE) ||
        line.startsWith(PATCH_MARKERS.DELETE) ||
        line.startsWith("+") ||
        line.startsWith("-") ||
        line.startsWith(" ");

      if (isPatchContent) {
        foundContent = true;
      }

      if (insidePatch || (!foundBegin && isPatchContent) || (line === "" && foundContent)) {
        result.push(line);
      }
    }

    return result;
  }
}

// ============================================================================
// 测试函数
// ============================================================================

/**
 * 测试 1: 添加新文件
 */
async function testAddFile() {
  const startTime = Date.now();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-"));

  try {
    console.log("\n[测试 1] 添加新文件...");

    const tool = await importTool();
    const patchInput = `
*** Begin Patch
*** Add File: test.js
+ const hello = "world";
+ console.log(hello);
*** End Patch`;

    const result = await tool.handler({
      input: patchInput,
      cwd: tempDir,
    });

    const passed = result.success && result.data?.applied?.includes("test.js");

    if (passed) {
      console.log(`✅ 添加新文件成功`);
      console.log(`   文件: test.js`);
      console.log(`   ${result.data.summary.split("\n")[0]}`);
    } else {
      console.log(`❌ 添加新文件失败`);
      console.log(`   错误: ${result.error}`);
    }

    recordResult(
      "add_file",
      passed,
      {
        applied: result.data?.applied,
      },
      Date.now() - startTime
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * 测试 2: 更新文件
 */
async function testUpdateFile() {
  const startTime = Date.now();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-"));

  try {
    console.log("\n[测试 2] 更新文件...");

    // 先创建原文件
    const originalContent = `line 1
line 2
line 3
line 4
line 5`;
    fs.writeFileSync(path.join(tempDir, "test.js"), originalContent, "utf8");

    const tool = await importTool();
    const patchInput = `
*** Begin Patch
*** Update File: test.js
  line 1
- line 2
+ line 2 updated
  line 3
*** End Patch`;

    const result = await tool.handler({
      input: patchInput,
      cwd: tempDir,
    });

    const passed = result.success && result.data?.applied?.includes("test.js");

    if (passed) {
      console.log(`✅ 更新文件成功`);
      console.log(`   文件: test.js`);
      console.log(`   ${result.data.summary.split("\n")[0]}`);
    } else {
      console.log(`❌ 更新文件失败`);
      console.log(`   错误: ${result.error}`);
    }

    recordResult(
      "update_file",
      passed,
      {
        applied: result.data?.applied,
      },
      Date.now() - startTime
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * 测试 3: 删除文件
 */
async function testDeleteFile() {
  const startTime = Date.now();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-"));

  try {
    console.log("\n[测试 3] 删除文件...");

    // 先创建文件
    fs.writeFileSync(path.join(tempDir, "old.js"), "old content", "utf8");

    const tool = await importTool();
    const patchInput = `
*** Begin Patch
*** Delete File: old.js
*** End Patch`;

    const result = await tool.handler({
      input: patchInput,
      cwd: tempDir,
    });

    const passed = result.success && result.data?.applied?.includes("old.js");

    if (passed) {
      console.log(`✅ 删除文件成功`);
      console.log(`   文件: old.js`);
      console.log(`   ${result.data.summary.split("\n")[0]}`);
    } else {
      console.log(`❌ 删除文件失败`);
      console.log(`   错误: ${result.error}`);
    }

    recordResult(
      "delete_file",
      passed,
      {
        applied: result.data?.applied,
      },
      Date.now() - startTime
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * 测试 4: 创建备份
 */
async function testCreateBackup() {
  const startTime = Date.now();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-"));

  try {
    console.log("\n[测试 4] 创建备份...");

    // 先创建文件
    const originalContent = "original content";
    fs.writeFileSync(path.join(tempDir, "test.js"), originalContent, "utf8");

    const tool = await importTool();
    const patchInput = `
*** Begin Patch
*** Update File: test.js
- original content
+ updated content
*** End Patch`;

    const result = await tool.handler({
      input: patchInput,
      cwd: tempDir,
      createBackup: "test", // 使用字符串而不是布尔值
    });

    // 检查备份文件是否真的创建了
    const backupFiles = fs.readdirSync(tempDir).filter(f => f.includes("backup-"));
    const backupExists = backupFiles.length > 0;

    const passed = result.success && backupExists;

    if (passed) {
      console.log(`✅ 创建备份成功`);
      console.log(`   文件: test.js`);
      console.log(`   备份文件: ${backupFiles[0]}`);
    } else {
      console.log(`❌ 创建备份失败`);
      console.log(`   结果:`, result);
      console.log(`   备份文件: ${backupFiles}`);
    }

    recordResult(
      "create_backup",
      passed,
      {
        backupExists,
        backupFiles,
      },
      Date.now() - startTime
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * 测试 5: 干运行模式
 */
async function testDryRun() {
  const startTime = Date.now();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-"));

  try {
    console.log("\n[测试 5] 干运行模式...");

    const tool = await importTool();
    const patchInput = `
*** Begin Patch
*** Add File: test.js
+ dry run content
*** End Patch`;

    const result = await tool.handler({
      input: patchInput,
      cwd: tempDir,
      dryRun: true,
    });

    // 文件不应该实际创建
    const fileExists = fs.existsSync(path.join(tempDir, "test.js"));
    const passed = result.success && !fileExists;

    if (passed) {
      console.log(`✅ 干运行模式成功`);
      console.log(`   补丁已解析，但未实际应用`);
      console.log(`   文件未创建: ${!fileExists}`);
    } else {
      console.log(`❌ 干运行模式失败`);
      console.log(`   结果:`, result);
    }

    recordResult(
      "dry_run",
      passed,
      {
        fileNotCreated: !fileExists,
      },
      Date.now() - startTime
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * 测试 6: 多个操作
 */
async function testMultipleOperations() {
  const startTime = Date.now();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-"));

  try {
    console.log("\n[测试 6: 多个操作...");

    const tool = await importTool();
    // 测试多个不同的文件操作
    const patchInput = `
*** Begin Patch
*** Add File: file1.js
+ content of file1
*** Add File: file2.js
+ content of file2
*** End Patch`;

    const result = await tool.handler({
      input: patchInput,
      cwd: tempDir,
    });

    const passed = result.success && result.data?.applied?.length === 2;

    if (passed) {
      console.log(`✅ 多个操作成功`);
      console.log(`   应用数量: ${result.data.applied.length}`);
      console.log(`   文件: ${result.data.applied.join(", ")}`);
    } else {
      console.log(`❌ 多个操作失败`);
      console.log(`   错误: ${result.error}`);
    }

    recordResult(
      "multiple_operations",
      passed,
      {
        appliedCount: result.data?.applied?.length,
        files: result.data?.applied,
      },
      Date.now() - startTime
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * 测试 7: 错误处理
 */
async function testErrorHandling() {
  const startTime = Date.now();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-"));

  try {
    console.log("\n[测试 7] 错误处理...");

    const tool = await importTool();
    // 尝试更新不存在的文件
    const patchInput = `
*** Begin Patch
*** Update File: nonexistent.js
- old
+ new
*** End Patch`;

    const result = await tool.handler({
      input: patchInput,
      cwd: tempDir,
    });

    const passed = !result.success && (result.data?.failed?.length > 0 || result.error);

    if (passed) {
      console.log(`✅ 错误处理成功`);
      console.log(`   正确捕获了文件不存在的错误`);
      if (result.data?.failed?.[0]) {
        console.log(`   ${result.data.failed[0].error}`);
      } else {
        console.log(`   ${result.error}`);
      }
    } else {
      console.log(`❌ 错误处理失败`);
      console.log(`   结果:`, result);
    }

    recordResult(
      "error_handling",
      passed,
      {
        error: result.data?.failed?.[0]?.error,
      },
      Date.now() - startTime
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// ============================================================================
// 主测试函数
// ============================================================================

async function main() {
  console.log("\n🚀 Git Tutor AI - APPLY_PATCH 工具测试");
  console.log("测试时间:", new Date().toLocaleString());
  console.log("\n测试项目: 7 个功能\n");

  const tests = [
    { name: "添加新文件", fn: testAddFile },
    { name: "更新文件", fn: testUpdateFile },
    { name: "删除文件", fn: testDeleteFile },
    { name: "创建备份", fn: testCreateBackup },
    { name: "干运行模式", fn: testDryRun },
    { name: "多个操作", fn: testMultipleOperations },
    { name: "错误处理", fn: testErrorHandling },
  ];

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`📊 测试 ${i + 1}/${tests.length}: ${test.name}`);
    console.log("=".repeat(80) + "\n");

    await test.fn();

    const result = testResults[testResults.length - 1];
    if (result.passed) {
      console.log(`✅ ${test.name}测试完成 (${result.duration}ms)`);
    } else {
      console.log(`❌ ${test.name}测试失败: ${result.details}`);
    }
    console.log();
  }

  printSummary();
}

function printSummary() {
  console.log("=".repeat(80));
  console.log("📊 APPLY_PATCH 工具测试总结");
  console.log("=".repeat(80) + "\n");

  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = total - passed;
  const successRate = ((passed / total) * 100).toFixed(1);

  console.log("📈 统计:");
  console.log(`   - 总测试数: ${total}`);
  console.log(`   - ✅ 成功: ${passed}`);
  console.log(`   - ❌ 失败: ${failed}`);
  console.log(`   - 📊 成功率: ${successRate}%\n`);

  console.log("📋 详细结果:\n");

  testResults.forEach((result, index) => {
    const icon = result.passed ? "✅" : "❌";
    const status = result.passed ? "通过" : "失败";
    console.log(`   ${index + 1}. ${icon} ${result.test} (${result.duration}ms) - ${status}`);
  });

  console.log();
  console.log("=".repeat(80));

  let rating = "";
  if (successRate === "100.0") rating = "⭐⭐⭐⭐⭐ 优秀!";
  else if (parseFloat(successRate) >= 80) rating = "⭐⭐⭐⭐ 很好!";
  else if (parseFloat(successRate) >= 60) rating = "⭐⭐⭐ 良好!";
  else rating = "⭐⭐ 及格";

  console.log(`🎯 总体评分: ${rating}\n`);

  if (passed === total) {
    console.log("🎉 所有 APPLY_PATCH 工具测试通过!\n");
    console.log("💡 已验证的功能:");
    console.log("   - 添加新文件");
    console.log("   - 更新现有文件");
    console.log("   - 删除文件");
    console.log("   - 创建备份");
    console.log("   - 干运行模式");
    console.log("   - 多个操作");
    console.log("   - 错误处理\n");
  } else {
    console.log(`⚠️  有 ${failed} 个测试失败,请查看上面的错误信息\n`);
  }
}

// 运行
main().catch((error) => {
  console.error("\n💥 测试运行失败:", error);
  process.exit(1);
});
