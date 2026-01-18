import('./packages/core/src/tools/index.ts').then(async (m) => {
  console.log('🧪 工具系统完整集成测试\n');
  console.log('='.repeat(50) + '\n');
  
  m.initializeTools();
  console.log('✅ 初始化完成\n');
  
  const allTools = m.toolRegistry.getAll();
  console.log(`总工具数: ${allTools.length}\n`);
  
  const byCategory = allTools.reduce((acc, tool) => {
    if (!acc[tool.category]) acc[tool.category] = [];
    acc[tool.category].push(tool);
    return acc;
  }, {});
  
  console.log('工具分类:');
  for (const [category, tools] of Object.entries(byCategory)) {
    console.log(`  ${category}: ${tools.length} 个`);
  }
  console.log('');
  
  const toolNames = allTools.map(t => t.name);
  const newTools = ['ask', 'act_mode_respond', 'browser_action', 'new_task'];
  
  console.log('新工具验证:');
  let allFound = true;
  for (const name of newTools) {
    const found = toolNames.includes(name);
    const status = found ? '✅' : '❌';
    console.log(`  ${status} ${name}`);
    if (!found) allFound = false;
  }
  console.log('');
  
  console.log('='.repeat(50));
  if (allFound) {
    console.log('🎉 所有新工具已成功集成!');
    process.exit(0);
  } else {
    console.log('⚠️  部分工具未注册');
    process.exit(1);
  }
}).catch(err => {
  console.error('❌ 失败:', err.message);
  process.exit(1);
});
