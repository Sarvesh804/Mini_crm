import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RedisService, REDIS_CHANNELS } from '@/lib/redis'
import { campaignSchema } from '@/lib/validation/campaign.schema'
import { createRateLimit, API_RATE_LIMITS } from '@/lib/rate-limit'

const rateLimit = createRateLimit(API_RATE_LIMITS.STANDARD)

interface CampaignRule {
  field: 'totalSpent' | 'visits' | 'lastVisit' | 'createdAt'
  operator: '>' | '<' | '>=' | '<=' | '=' | '!=' | 'days_ago'
  value: string | number
}

interface CampaignData {
  name: string
  rules: CampaignRule[]
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const rateLimitResponse = await rateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const body = await request.json()
    const validatedData = campaignSchema.parse(body) as CampaignData

    // Calculate audience size
    const audienceSize = await calculateAudienceSize(validatedData.rules)

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        name: validatedData.name,
        rules: validatedData.rules,
        message: validatedData.message,
        audienceSize,
        createdBy: session.user.id,
        status: 'ACTIVE',
      },
    })

    // Trigger campaign delivery
    await RedisService.publishMessage(REDIS_CHANNELS.CAMPAIGN_DELIVERY, {
      campaignId: campaign.id,
      rules: validatedData.rules,
      message: validatedData.message,
      userId: session.user.id,
    })

    await RedisService.incrementMetric('api:campaigns:created', 1)

    return NextResponse.json({
      success: true,
      message: 'Campaign created and delivery initiated',
      data: campaign,
    })
  } catch (error: any) {
    console.error('Campaign API Error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

    const campaigns = await prisma.campaign.findMany({
      where: { createdBy: session.user.id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: {
            campaignLogs: true,
          },
        },
        campaignLogs: {
          select: {
            status: true,
          },
        },
      },
    })

    // Calculate delivery stats for each campaign
    const campaignsWithStats = campaigns.map(campaign => {
      const logs = campaign.campaignLogs || []
      const sent = logs.filter(log => log.status === 'SENT').length
      const failed = logs.filter(log => log.status === 'FAILED').length
      const pending = logs.filter(log => log.status === 'PENDING').length

      return {
        ...campaign,
        stats: {
          sent,
          failed,
          pending,
          total: logs.length,
          successRate: logs.length > 0 ? ((sent / logs.length) * 100).toFixed(1) : '0',
        },
        campaignLogs: undefined, // Remove raw logs from response
      }
    })

    const total = await prisma.campaign.count({
      where: { createdBy: session.user.id },
    })

    return NextResponse.json({
      success: true,
      data: campaignsWithStats,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    })
  } catch (error: any) {
    console.error('Get Campaigns Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

async function calculateAudienceSize(rules: CampaignRule[]): Promise<number> {
  try {
    const whereClause = buildWhereClause(rules)
    return await prisma.customer.count({ where: whereClause })
  } catch (error) {
    console.error('Error calculating audience size:', error)
    return 0
  }
}

function buildWhereClause(rules: CampaignRule[]): Record<string, any> {
  if (rules.length === 0) return {}

  const conditions: Record<string, any>[] = []

  for (const rule of rules) {
    const condition: Record<string, any> = {}

    switch (rule.field) {
      case 'totalSpent':
        condition.totalSpent = buildOperatorCondition(rule.operator, Number(rule.value))
        break
      case 'visits':
        condition.visits = buildOperatorCondition(rule.operator, Number(rule.value))
        break
      case 'lastVisit':
        if (rule.operator === 'days_ago') {
          const daysAgo = new Date()
          daysAgo.setDate(daysAgo.getDate() - parseInt(String(rule.value)))
          condition.lastVisit = { lt: daysAgo }
        } else {
          condition.lastVisit = buildOperatorCondition(rule.operator, new Date(String(rule.value)))
        }
        break
      case 'createdAt':
        condition.createdAt = buildOperatorCondition(rule.operator, new Date(String(rule.value)))
        break
    }

    conditions.push(condition)
  }

  // Combine conditions based on logic
  if (conditions.length === 1) {
    return conditions[0]
  }

  // For now, assume all conditions are AND (can be enhanced for mixed AND/OR)
  return { AND: conditions }
}

function buildOperatorCondition(operator: string, value: any): Record<string, any> {
  switch (operator) {
    case '>':
      return { gt: value }
    case '<':
      return { lt: value }
    case '>=':
      return { gte: value }
    case '<=':
      return { lte: value }
    case '=':
      return { equals: value }
    case '!=':
      return { not: value }
    default:
      return { equals: value }
  }
}