import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RedisService } from '@/lib/redis'

function safeJson(obj: any) {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) =>
      typeof value === 'bigint' ? Number(value) : value
    )
  )
}


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // days
    const type = searchParams.get('type') || 'overview' // overview, campaigns, customers

    const periodDays = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)

    let analyticsData: any = {}

    switch (type) {
      case 'overview':
        analyticsData = await getOverviewAnalytics(session.user.id, startDate, periodDays)
        break
      case 'campaigns':
        analyticsData = await getCampaignAnalytics(session.user.id, startDate)
        break
      case 'customers':
        analyticsData = await getCustomerAnalytics(startDate)
        break
      default:
        analyticsData = await getOverviewAnalytics(session.user.id, startDate, periodDays)
    }

    return NextResponse.json(safeJson({
      success: true,
      data: analyticsData,
      meta: {
        period: periodDays,
        type,
        generatedAt: new Date().toISOString()
      }
    }))
    

  } catch (error: any) {
    console.error('Analytics API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

async function getOverviewAnalytics(userId: string, startDate: Date, periodDays: number) {
  // Get Redis metrics
  const redisMetrics = await RedisService.getMetrics()

  // Get revenue over time
  const revenueData = await prisma.$queryRaw`
    SELECT 
      DATE("createdAt") as date,
      SUM(amount) as total_amount,
      COUNT(*) as order_count
    FROM "orders"
    WHERE "createdAt" >= ${startDate}
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `

  // Get customer acquisition over time
  const customerData = await prisma.$queryRaw`
    SELECT 
      DATE("createdAt") as date,
      COUNT(*) as new_customers
    FROM "customers"
    WHERE "createdAt" >= ${startDate}
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `

  // Get campaign performance
  const campaignStats = await prisma.campaign.findMany({
    where: {
      createdBy: userId,
      createdAt: {
        gte: startDate
      }
    },
    include: {
      campaignLogs: {
        select: {
          status: true,
          cost: true,
          createdAt: true
        }
      }
    }
  })

  const campaignPerformance = campaignStats.map(campaign => {
    const logs = campaign.campaignLogs || []
    const sent = logs.filter(log => log.status === 'SENT').length
    const failed = logs.filter(log => log.status === 'FAILED').length
    const pending = logs.filter(log => log.status === 'PENDING').length
    const totalCost = logs.reduce((sum, log) => sum + Number(log.cost || 0), 0)

    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      sent,
      failed,
      pending,
      total: logs.length,
      successRate: logs.length > 0 ? ((sent / logs.length) * 100).toFixed(1) : '0',
      totalCost: totalCost.toFixed(4),
      audienceSize: campaign.audienceSize,
      createdAt: campaign.createdAt
    }
  })

  // Current vs Previous period comparison
  const previousPeriodStart = new Date(startDate)
  previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays)

  const [currentRevenue, previousRevenue, currentCustomers, previousCustomers] = await Promise.all([
    prisma.order.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where: { createdAt: { gte: startDate } }
    }),
    prisma.order.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where: { 
        createdAt: { 
          gte: previousPeriodStart,
          lt: startDate
        }
      }
    }),
    prisma.customer.count({
      where: { createdAt: { gte: startDate } }
    }),
    prisma.customer.count({
      where: { 
        createdAt: { 
          gte: previousPeriodStart,
          lt: startDate
        }
      }
    })
  ])

  // Customer segments
  const customerSegments = await Promise.all([
    prisma.customer.count({ where: { totalSpent: { gte: 1000 } } }),
    prisma.customer.count({ where: { totalSpent: { gte: 100, lt: 1000 } } }),
    prisma.customer.count({ where: { totalSpent: { lt: 100 } } })
  ])

  // Top customers
  const topCustomers = await prisma.customer.findMany({
    orderBy: { totalSpent: 'desc' },
    take: 10,
    select: {
      id: true,
      name: true,
      email: true,
      totalSpent: true,
      visits: true,
      createdAt: true
    }
  })

  return {
    metrics: {
      ...redisMetrics,
      campaigns: {
        total: campaignStats.length,
        active: campaignStats.filter(c => c.status === 'ACTIVE').length,
        completed: campaignStats.filter(c => c.status === 'COMPLETED').length
      }
    },
    revenue: {
      current: currentRevenue._sum.amount || 0,
      previous: previousRevenue._sum.amount || 0,
      growth: calculateGrowthPercentage(
        currentRevenue._sum.amount || 0,
        previousRevenue._sum.amount || 0
      ),
      chartData: revenueData
    },
    customers: {
      current: currentCustomers,
      previous: previousCustomers,
      growth: calculateGrowthPercentage(currentCustomers, previousCustomers),
      chartData: customerData,
      segments: {
        vip: customerSegments[0],
        regular: customerSegments[1],
        new: customerSegments[2]
      },
      top: topCustomers
    },
    campaigns: {
      performance: campaignPerformance,
      totalCampaigns: campaignStats.length,
      avgSuccessRate: campaignPerformance.length > 0 
        ? (campaignPerformance.reduce((acc, camp) => acc + parseFloat(camp.successRate), 0) / campaignPerformance.length).toFixed(1)
        : '0'
    }
  }
}

async function getCampaignAnalytics(userId: string, startDate: Date) {
  const campaigns = await prisma.campaign.findMany({
    where: {
      createdBy: userId,
      createdAt: { gte: startDate }
    },
    include: {
      campaignLogs: {
        include: {
          customer: {
            select: {
              name: true,
              email: true,
              totalSpent: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return {
    campaigns: campaigns.map(campaign => {
      const logs = campaign.campaignLogs || []
      const sentLogs = logs.filter(log => log.status === 'SENT')
      const failedLogs = logs.filter(log => log.status === 'FAILED')
      
      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        audienceSize: campaign.audienceSize,
        createdAt: campaign.createdAt,
        completedAt: campaign.completedAt,
        stats: {
          sent: sentLogs.length,
          failed: failedLogs.length,
          pending: logs.filter(log => log.status === 'PENDING').length,
          total: logs.length,
          successRate: logs.length > 0 ? ((sentLogs.length / logs.length) * 100).toFixed(1) : '0',
          totalCost: logs.reduce((sum, log) => sum + Number(log.cost || 0), 0).toFixed(4)
        },
        recentLogs: logs.slice(0, 10).map(log => ({
          id: log.id,
          customerId: log.customerId,
          customerName: log.customer?.name,
          customerEmail: log.customer?.email,
          status: log.status,
          messageId: log.messageId,
          vendor: log.vendor,
          cost: log.cost,
          createdAt: log.createdAt,
          deliveredAt: log.deliveredAt,
          failureReason: log.failureReason
        }))
      }
    })
  }
}

async function getCustomerAnalytics(startDate: Date) {
  // Customer behavior analysis
  const customerBehavior = await prisma.$queryRaw`
    SELECT 
      c.id,
      c.name,
      c.email,
      c.total_spent,
      c.visits,
      c.created_at,
      COUNT(cl.id) as messages_received,
      COUNT(CASE WHEN cl.status = 'SENT' THEN 1 END) as messages_delivered,
      MAX(cl.delivered_at) as last_message_delivered
    FROM "Customer" c
    LEFT JOIN "CampaignLog" cl ON c.id = cl.customer_id
    WHERE c.created_at >= ${startDate}
    GROUP BY c.id, c.name, c.email, c.total_spent, c.visits, c.created_at
    ORDER BY c.total_spent DESC
    LIMIT 100
  `

  return {
    customerBehavior,
    summary: {
      totalCustomers: await prisma.customer.count(),
      newCustomers: await prisma.customer.count({
        where: { createdAt: { gte: startDate } }
      }),
      activeCustomers: await prisma.customer.count({
        where: { lastVisit: { gte: startDate } }
      })
    }
  }
}

function calculateGrowthPercentage(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}