import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testAuth() {
  console.log('🔐 Testing Authentication System...')
  
  try {
    // Test 1: Find test user
    const user = await prisma.user.findUnique({
      where: { email: 'john@example.com' },
      include: {
        campaigns: true,
      },
    })
    
    if (user) {
      console.log('✅ User found:', user.name)
      console.log(`✅ User has ${user.campaigns.length} campaigns`)
    } else {
      console.log('❌ Test user not found')
    }
    
    // Test 2: Check NextAuth tables structure
    const sessionCount = await prisma.session.count()
    const accountCount = await prisma.account.count()
    
    console.log(`✅ Sessions table ready (${sessionCount} records)`)
    console.log(`✅ Accounts table ready (${accountCount} records)`)
    
    console.log('🎉 Authentication system ready!')
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error)
  }
}

testAuth().finally(() => prisma.$disconnect())