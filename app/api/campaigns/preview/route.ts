import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const previewSchema = z.object({
  rules: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.union([z.string(), z.number()]),
    logic: z.string().optional(),
  })),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { rules } = previewSchema.parse(body)

    if (rules.length === 0) {
      const totalCustomers = await prisma.customer.count()
      return NextResponse.json({
        success: true,
        data: {
          audienceSize: totalCustomers,
          description: 'All customers',
          sampleCustomers: await prisma.customer.findMany({
            take: 5,
            select: { id: true, name: true, email: true, totalSpent: true, visits: true },
          }),
        },
      })
    }

    const whereClause = buildWhereClause(rules)
    
    const [audienceSize, sampleCustomers] = await Promise.all([
      prisma.customer.count({ where: whereClause }),
      prisma.customer.findMany({
        where: whereClause,
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          totalSpent: true,
          visits: true,
          lastVisit: true,
        },
      }),
    ])

    const description = generateAudienceDescription(rules, audienceSize)

    return NextResponse.json({
      success: true,
      data: {
        audienceSize,
        description,
        sampleCustomers,
        rules,
      },
    })
  } catch (error: any) {
    console.error('Campaign Preview Error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid rules format',
          errors: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Failed to preview audience' },
      { status: 500 }
    )
  }
}

function buildWhereClause(rules: any[]): any {
  // Same implementation as in campaigns/route.ts
  if (rules.length === 0) return {}

  const conditions: any[] = []

  for (const rule of rules) {
    const condition: any = {}

    switch (rule.field) {
      case 'totalSpent':
        condition.totalSpent = buildOperatorCondition(rule.operator, rule.value)
        break
      case 'visits':
        condition.visits = buildOperatorCondition(rule.operator, rule.value)
        break
      case 'lastVisit':
        if (rule.operator === 'days_ago') {
          const daysAgo = new Date()
          daysAgo.setDate(daysAgo.getDate() - parseInt(rule.value))
          condition.lastVisit = { lt: daysAgo }
        } else {
          condition.lastVisit = buildOperatorCondition(rule.operator, new Date(rule.value))
        }
        break
      case 'createdAt':
        condition.createdAt = buildOperatorCondition(rule.operator, new Date(rule.value))
        break
    }

    conditions.push(condition)
  }

  if (conditions.length === 1) {
    return conditions[0]
  }

  return { AND: conditions }
}

function buildOperatorCondition(operator: string, value: any): any {
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

function generateAudienceDescription(rules: any[], audienceSize: number): string {
  if (rules.length === 0) return `All ${audienceSize} customers`
  
  const descriptions = rules.map(rule => {
    const field = rule.field.replace(/([A-Z])/g, ' $1').toLowerCase()
    let desc = `${field} ${rule.operator} ${rule.value}`
    
    if (rule.operator === 'days_ago') {
      desc = `${field} more than ${rule.value} days ago`
    }
    
    return desc
  })
  
  return `${audienceSize} customers where ${descriptions.join(' AND ')}`
}