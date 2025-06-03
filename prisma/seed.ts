import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function quickSeed() {
  console.log('🌱 Adding real data to database...')

  try {
    // Clean existing data
    await prisma.campaignLog.deleteMany()
    await prisma.communicationLog.deleteMany()
    await prisma.campaign.deleteMany()
    await prisma.order.deleteMany()
    await prisma.customer.deleteMany()

    // Get current user (from Google OAuth)
    const currentUser = await prisma.user.findFirst()
    
    if (!currentUser) {
      console.log('❌ No user found. Sign in first, then run this script.')
      return
    }

    console.log(`✅ Found user: ${currentUser.email}`)

    // Create customers
    console.log('👥 Creating customers...')
    const customers = await Promise.all([
      prisma.customer.create({
        data: {
          name: 'Alice Johnson',
          email: 'alice@example.com',
          totalSpent: 2500.00,
          visits: 25,
          lastVisit: new Date('2024-01-15'),
        },
      }),
      prisma.customer.create({
        data: {
          name: 'Bob Smith',
          email: 'bob@example.com',
          totalSpent: 1800.50,
          visits: 18,
          lastVisit: new Date('2024-01-10'),
        },
      }),
      prisma.customer.create({
        data: {
          name: 'Carol Davis',
          email: 'carol@example.com',
          totalSpent: 750.25,
          visits: 8,
          lastVisit: new Date('2023-12-20'),
        },
      }),
      prisma.customer.create({
        data: {
          name: 'David Wilson',
          email: 'david@example.com',
          totalSpent: 950.00,
          visits: 12,
          lastVisit: new Date('2024-01-05'),
        },
      }),
      prisma.customer.create({
        data: {
          name: 'Eva Brown',
          email: 'eva@example.com',
          totalSpent: 125.75,
          visits: 3,
          lastVisit: new Date('2023-11-15'),
        },
      }),
    ])

    console.log(`✅ Created ${customers.length} customers`)

    // Create orders for each customer
    console.log('💰 Creating orders...')
    let totalOrders = 0
    for (const customer of customers) {
      const orderCount = Math.ceil(customer.visits / 3)
      for (let i = 0; i < orderCount; i++) {
        await prisma.order.create({
          data: {
            customerId: customer.id,
            amount: Math.random() * (customer.totalSpent / orderCount) + 20,
            createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
          },
        })
        totalOrders++
      }
    }

    console.log(`✅ Created ${totalOrders} orders`)

    // Create campaigns
    console.log('🎯 Creating campaigns...')
    const campaigns = await Promise.all([
      prisma.campaign.create({
        data: {
          name: 'Welcome New Users',
          rules: [
            { field: 'visits', operator: '<', value: 5 }
          ],
          message: 'Welcome {customerName}! Thanks for joining us. Here\'s a special 10% off!',
          audienceSize: 2,
          status: 'COMPLETED',
          createdBy: currentUser.id,
          completedAt: new Date(),
        },
      }),
      prisma.campaign.create({
        data: {
          name: 'High-Value Customer Rewards',
          rules: [
            { field: 'totalSpent', operator: '>', value: 1000 }
          ],
          message: 'Hi {customerName}, as one of our valued customers, enjoy this exclusive 20% discount!',
          audienceSize: 3,
          status: 'ACTIVE',
          createdBy: currentUser.id,
        },
      }),
    ])

    console.log(`✅ Created ${campaigns.length} campaigns`)

    // Final summary
    const summary = await Promise.all([
      prisma.customer.count(),
      prisma.order.count(),
      prisma.campaign.count(),
    ])

    console.log('\n🎉 Seed completed successfully!')
    console.log(`📊 Summary: ${summary[0]} customers, ${summary[1]} orders, ${summary[2]} campaigns`)

  } catch (error) {
    console.error('❌ Seed failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

quickSeed()