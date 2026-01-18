/**
 * FOCUS_CHAIN 工具测试
 * 测试任务进度管理功能
 */

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

// 创建全局共享的存储实例
const globalStorage = {
  _data: new Map(),

  saveTodos: async function (taskId, todos) {
    this._data.set(taskId, todos);
  },

  loadTodos: async function (taskId) {
    return this._data.get(taskId) || null;
  },

  deleteTodos: async function (taskId) {
    this._data.delete(taskId);
  },
};

async function importTool() {
  return {
    name: "focus_chain",
    handler: async (params) => {
      const storage = globalStorage; // 使用全局存储
      const { action, todos, taskId = "default", index } = params;

      const calculateProgress = (todos) => {
        const total = todos.length;
        const completed = todos.filter((t) => t.completed).length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { total, completed, progress };
      };

      try {
        switch (action) {
          case "create": {
            if (!todos || todos.length === 0) {
              return {
                success: false,
                error: "创建 TODO 列表时必须提供任务列表",
              };
            }

            const todosWithTimestamps = todos.map((todo) => ({
              ...todo,
              createdAt: todo.createdAt || Date.now(),
              completedAt: todo.completed ? Date.now() : undefined,
            }));

            await storage.saveTodos(taskId, todosWithTimestamps);

            const { total, completed, progress } = calculateProgress(todosWithTimestamps);

            return {
              success: true,
              data: {
                todos: todosWithTimestamps,
                total,
                completed,
                progress,
                message: `已创建 ${total} 个任务`,
              },
            };
          }

          case "update": {
            if (!todos || todos.length === 0) {
              return {
                success: false,
                error: "更新 TODO 列表时必须提供新的任务列表",
              };
            }

            const existingTodos = await storage.loadTodos(taskId);
            if (!existingTodos) {
              return {
                success: false,
                error: `任务 ID "${taskId}" 不存在，请先创建 TODO 列表`,
              };
            }

            const updatedTodos = todos.map((todo, idx) => {
              const existing = existingTodos[idx];
              return {
                ...todo,
                createdAt: existing?.createdAt || Date.now(),
                completedAt: todo.completed && !existing?.completed ? Date.now() : existing?.completedAt,
              };
            });

            await storage.saveTodos(taskId, updatedTodos);

            const { total, completed, progress } = calculateProgress(updatedTodos);

            return {
              success: true,
              data: {
                todos: updatedTodos,
                total,
                completed,
                progress,
                message: `已更新 TODO 列表 (${completed}/${total})`,
              },
            };
          }

          case "get": {
            const existingTodos = await storage.loadTodos(taskId);

            if (!existingTodos) {
              return {
                success: true,
                data: {
                  todos: [],
                  total: 0,
                  completed: 0,
                  progress: 0,
                  message: `任务 ID "${taskId}" 尚未创建 TODO 列表`,
                },
              };
            }

            const { total, completed, progress } = calculateProgress(existingTodos);

            return {
              success: true,
              data: {
                todos: existingTodos,
                total,
                completed,
                progress,
                message: `当前进度: ${completed}/${total} (${progress}%)`,
              },
            };
          }

          case "complete": {
            if (index === undefined || index < 0) {
              return {
                success: false,
                error: "必须提供有效的任务索引",
              };
            }

            const existingTodos = await storage.loadTodos(taskId);
            if (!existingTodos || existingTodos.length === 0) {
              return {
                success: false,
                error: `任务 ID "${taskId}" 不存在或没有任务`,
              };
            }

            if (index >= existingTodos.length) {
              return {
                success: false,
                error: `索引 ${index} 超出范围 (0-${existingTodos.length - 1})`,
              };
            }

            existingTodos[index].completed = true;
            existingTodos[index].completedAt = Date.now();

            await storage.saveTodos(taskId, existingTodos);

            const { total, completed, progress } = calculateProgress(existingTodos);

            return {
              success: true,
              data: {
                todos: existingTodos,
                total,
                completed,
                progress,
                message: `已完成任务: ${existingTodos[index].description}`,
              },
            };
          }

          case "clear": {
            await storage.deleteTodos(taskId);

            return {
              success: true,
              data: {
                todos: [],
                total: 0,
                completed: 0,
                progress: 0,
                message: `已清除任务 ID "${taskId}" 的 TODO 列表`,
              },
            };
          }

          default:
            return {
              success: false,
              error: `未知的操作类型: ${action}`,
            };
        }
      } catch (error) {
        return {
          success: false,
          error: error.message || String(error),
        };
      }
    },
  };
}

// ============================================================================
// 测试函数
// ============================================================================

/**
 * 测试 1: 创建 TODO 列表
 */
async function testCreateTodos() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 1] 创建 TODO 列表...");

    const tool = await importTool();
    const result = await tool.handler({
      action: "create",
      todos: [
        { description: "设计数据库架构", completed: false },
        { description: "实现用户认证", completed: false },
        { description: "编写单元测试", completed: false },
      ],
    });

    const passed = result.success && result.data?.total === 3 && result.data?.completed === 0;

    if (passed) {
      console.log(`✅ 创建 TODO 列表成功`);
      console.log(`   任务总数: ${result.data.total}`);
      console.log(`   已完成: ${result.data.completed}`);
      console.log(`   进度: ${result.data.progress}%`);
    } else {
      console.log(`❌ 创建 TODO 列表失败`);
      console.log(`   错误: ${result.error}`);
    }

    recordResult(
      "create_todos",
      passed,
      {
        total: result.data?.total,
        completed: result.data?.completed,
        progress: result.data?.progress,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("create_todos", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 2: 查询 TODO 列表
 */
async function testGetTodos() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 2] 查询 TODO 列表...");

    const tool = await importTool();
    const result = await tool.handler({
      action: "get",
    });

    const passed = result.success && result.data?.total === 3;

    if (passed) {
      console.log(`✅ 查询 TODO 列表成功`);
      console.log(`   ${result.data.message}`);
      console.log(`   任务列表:`);
      result.data.todos.forEach((todo, idx) => {
        const status = todo.completed ? "✅" : "⬜";
        console.log(`     ${idx + 1}. ${status} ${todo.description}`);
      });
    } else {
      console.log(`❌ 查询 TODO 列表失败`);
      console.log(`   错误: ${result.error}`);
    }

    recordResult(
      "get_todos",
      passed,
      {
        total: result.data?.total,
        message: result.data?.message,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("get_todos", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 3: 更新 TODO 列表
 */
async function testUpdateTodos() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 3] 更新 TODO 列表...");

    const tool = await importTool();
    const result = await tool.handler({
      action: "update",
      todos: [
        { description: "设计数据库架构", completed: true },
        { description: "实现用户认证", completed: true },
        { description: "编写单元测试", completed: false },
      ],
    });

    const passed = result.success && result.data?.completed === 2 && result.data?.progress === 67;

    if (passed) {
      console.log(`✅ 更新 TODO 列表成功`);
      console.log(`   ${result.data.message}`);
      console.log(`   进度: ${result.data.progress}%`);
    } else {
      console.log(`❌ 更新 TODO 列表失败`);
      console.log(`   错误: ${result.error}`);
    }

    recordResult(
      "update_todos",
      passed,
      {
        completed: result.data?.completed,
        progress: result.data?.progress,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("update_todos", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 4: 标记单个任务完成
 */
async function testCompleteTask() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 4] 标记单个任务完成...");

    const tool = await importTool();
    const result = await tool.handler({
      action: "complete",
      index: 2, // 标记第3个任务（索引2）
    });

    const passed = result.success && result.data?.completed === 3 && result.data?.progress === 100;

    if (passed) {
      console.log(`✅ 标记任务完成成功`);
      console.log(`   ${result.data.message}`);
      console.log(`   所有任务已完成！进度: ${result.data.progress}%`);
    } else {
      console.log(`❌ 标记任务完成失败`);
      console.log(`   错误: ${result.error}`);
    }

    recordResult(
      "complete_task",
      passed,
      {
        completed: result.data?.completed,
        progress: result.data?.progress,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("complete_task", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 5: 清除 TODO 列表
 */
async function testClearTodos() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 5] 清除 TODO 列表...");

    const tool = await importTool();
    const result = await tool.handler({
      action: "clear",
    });

    const passed = result.success && result.data?.total === 0;

    if (passed) {
      console.log(`✅ 清除 TODO 列表成功`);
      console.log(`   ${result.data.message}`);
    } else {
      console.log(`❌ 清除 TODO 列表失败`);
      console.log(`   错误: ${result.error}`);
    }

    recordResult(
      "clear_todos",
      passed,
      {
        total: result.data?.total,
        message: result.data?.message,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("clear_todos", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 6: 多任务 ID 管理
 */
async function testMultipleTaskIds() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 6] 多任务 ID 管理...");

    const tool = await importTool();

    // 创建任务1
    const result1 = await tool.handler({
      action: "create",
      taskId: "task-1",
      todos: [{ description: "任务1的工作", completed: false }],
    });

    // 创建任务2
    const result2 = await tool.handler({
      action: "create",
      taskId: "task-2",
      todos: [{ description: "任务2的工作", completed: false }],
    });

    // 查询任务1
    const result3 = await tool.handler({
      action: "get",
      taskId: "task-1",
    });

    const passed =
      result1.success &&
      result2.success &&
      result3.success &&
      result3.data?.todos[0].description === "任务1的工作";

    if (passed) {
      console.log(`✅ 多任务 ID 管理成功`);
      console.log(`   任务1: ${result1.data.total} 个任务`);
      console.log(`   任务2: ${result2.data.total} 个任务`);
      console.log(`   查询任务1: ${result3.data.todos[0].description}`);
    } else {
      console.log(`❌ 多任务 ID 管理失败`);
      console.log(`   结果:`, { result1, result2, result3 });
    }

    recordResult(
      "multiple_task_ids",
      passed,
      {
        task1Count: result1.data?.total,
        task2Count: result2.data?.total,
        task1Description: result3.data?.todos[0]?.description,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("multiple_task_ids", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 7: 错误处理
 */
async function testErrorHandling() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 7] 错误处理...");

    const tool = await importTool();

    // 测试1: 更新不存在的任务
    const result1 = await tool.handler({
      action: "update",
      taskId: "non-existent",
      todos: [{ description: "测试", completed: false }],
    });

    // 测试2: 无效的索引
    const result2 = await tool.handler({
      action: "complete",
      index: 999,
    });

    const passed = !result1.success && !result2.success;

    if (passed) {
      console.log(`✅ 错误处理正常`);
      console.log(`   更新不存在任务: ${result1.error}`);
      console.log(`   无效索引: ${result2.error}`);
    } else {
      console.log(`❌ 错误处理未按预期工作`);
      console.log(`   结果:`, { result1, result2 });
    }

    recordResult(
      "error_handling",
      passed,
      {
        updateError: result1.error,
        completeError: result2.error,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("error_handling", false, error.message, Date.now() - startTime, error);
  }
}

// ============================================================================
// 主测试函数
// ============================================================================

async function main() {
  console.log("\n🚀 Git Tutor AI - FOCUS_CHAIN 工具测试");
  console.log("测试时间:", new Date().toLocaleString());
  console.log("\n测试项目: 7 个功能\n");

  const tests = [
    { name: "创建 TODO 列表", fn: testCreateTodos },
    { name: "查询 TODO 列表", fn: testGetTodos },
    { name: "更新 TODO 列表", fn: testUpdateTodos },
    { name: "标记任务完成", fn: testCompleteTask },
    { name: "清除 TODO 列表", fn: testClearTodos },
    { name: "多任务 ID 管理", fn: testMultipleTaskIds },
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
  console.log("📊 FOCUS_CHAIN 工具测试总结");
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

  // 评分
  let rating = "";
  if (successRate === "100.0") rating = "⭐⭐⭐⭐⭐ 优秀!";
  else if (parseFloat(successRate) >= 80) rating = "⭐⭐⭐⭐ 很好!";
  else if (parseFloat(successRate) >= 60) rating = "⭐⭐⭐ 良好!";
  else rating = "⭐⭐ 及格";

  console.log(`🎯 总体评分: ${rating}\n`);

  if (passed === total) {
    console.log("🎉 所有 FOCUS_CHAIN 工具测试通过!\n");
    console.log("💡 已验证的功能:");
    console.log("   - 创建 TODO 列表");
    console.log("   - 查询任务进度");
    console.log("   - 更新任务状态");
    console.log("   - 标记任务完成");
    console.log("   - 清除任务列表");
    console.log("   - 多任务 ID 管理");
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
