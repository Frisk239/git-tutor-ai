import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 创建默认用户
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      name: 'Default User',
      settings: {
        create: {
          aiProvider: 'anthropic',
          aiModel: 'claude-sonnet-4-5-20250929',
        },
      },
    },
  })

  console.log('✅ Seed completed:', { user })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
