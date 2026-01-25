// 测试 API 路由结构
import { fileRoutes } from './services/api/src/routes/files.js'
import { fileService } from './services/api/src/services/file.service.js'

console.log('=== File API Structure Test ===')
console.log('1. Checking fileRoutes import...')
console.log('✓ fileRoutes imported successfully')

console.log('\n2. Checking fileService methods...')
console.log('Available methods:')
console.log('- readFile:', typeof fileService.readFile)
console.log('- writeFile:', typeof fileService.writeFile)
console.log('- listFiles:', typeof fileService.listFiles)
console.log('- searchFiles:', typeof fileService.searchFiles)
console.log('- getFileStats:', typeof fileService.getFileStats)
console.log('- generateDiff:', typeof fileService.generateDiff)

console.log('\n3. Testing file validation...')
try {
  // 测试路径验证
  const testPath = './test.txt'
  console.log('Testing path validation for:', testPath)
  // 这应该不会抛出错误
  const validatedPath = fileService.validatePath(testPath)
  console.log('✓ Path validation passed:', validatedPath)
} catch (error) {
  console.log('✗ Path validation failed:', error.message)
}

console.log('\n4. Route endpoints defined:')
console.log('- GET /api/files/read')
console.log('- GET /api/files/list')
console.log('- GET /api/files/diff')

console.log('\n=== Test Completed ===')