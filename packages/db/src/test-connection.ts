import { prisma } from './index'

async function testConnection() {
  try {
    await prisma.$connect()
    console.log('✅ Database connected successfully')

    // 测试查询
    const userCount = await prisma.user.count()
    console.log(`✅ Found ${userCount} users in database`)

    await prisma.$disconnect()
    process.exit(0)
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    process.exit(1)
  }
}

testConnection()
