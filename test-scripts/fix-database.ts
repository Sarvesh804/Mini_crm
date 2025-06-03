import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testNextAuthTables() {
  console.log('🔍 Testing NextAuth table names...')
  
  try {
    // Test all NextAuth tables with correct casing
    const tests = [
      { name: 'users', test: () => prisma.user.count() },
      { name: 'accounts', test: () => prisma.account.count() },
      { name: 'sessions', test: () => prisma.session.count() },
      { name: 'verificationtokens', test: () => prisma.verificationToken.findMany() },
    ]
    
    for (const { name, test } of tests) {
      try {
        const result = await test()
        console.log(`✅ ${name} table working (${Array.isArray(result) ? result.length : result} records)`)
      } catch (error) {
        console.log(`❌ ${name} table failed:`, error.message)
      }
    }
    
    // Test our custom tables too
    const customTests = [
      { name: 'customers', test: () => prisma.customer.count() },
      { name: 'orders', test: () => prisma.order.count() },
      { name: 'campaigns', test: () => prisma.campaign.count() },
      { name: 'campaign_logs', test: () => prisma.campaignLog.count() },
      { name: 'communication_logs', test: () => prisma.communicationLog.count() },
    ]
    
    for (const { name, test } of customTests) {
      try {
        const result = await test()
        console.log(`✅ ${name} table working (${result} records)`)
      } catch (error) {
        console.log(`❌ ${name} table failed:`, error.message)
      }
    }
    
    console.log('\n🎉 NextAuth table names should now be correct!')
    
  } catch (error) {
    console.error('💥 Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testNextAuthTables()