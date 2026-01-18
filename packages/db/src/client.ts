import { PrismaClient } from '@prisma/client'

// PrismaClient 单例模式
// 避免在开发环境中因为热重载创建多个连接
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// 优雅关闭连接
export async function disconnectPrisma() {
  await prisma.$disconnect()
}

// 优雅关闭
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await disconnectPrisma()
  })
}
