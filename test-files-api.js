// 简单的测试脚本，用于验证文件 API 路由
import { fileRoutes } from './services/api/src/routes/files.js'
import { fileService } from './services/api/src/services/file.service.js'

console.log('Testing file service...')

// 测试文件服务
try {
  const result = await fileService.listFiles('.')
  console.log('List files result:', result)
} catch (error) {
  console.error('Error listing files:', error.message)
}

console.log('File service test completed')