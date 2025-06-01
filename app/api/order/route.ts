import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RedisService, REDIS_CHANNELS } from '@/lib/redis'
import { orderSchema, orderBulkSchema } from '@/lib/validation/order.schema'
import { createRateLimit, API_RATE_LIMITS } from '@/lib/rate-limit'

const rateLimitStandard = createRateLimit(API_RATE_LIMITS.STANDARD)
const rateLimitBulk = createRateLimit(API_RATE_LIMITS.BULK)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const rateLimitResponse = await rateLimitStandard(request)
    if (rateLimitResponse) return rateLimitResponse

    const body = await request.json()
    const isBulk = Array.isArray(body.orders)
    
    if (isBulk) {
      const bulkRateLimitResponse = await rateLimitBulk(request)
      if (bulkRateLimitResponse) return bulkRateLimitResponse
      
      const validatedData = orderBulkSchema.parse(body)
      
      // Validate all customer IDs exist
      const customerIds = [...new Set(validatedData.orders.map(o => o.customerId))]
      const existingCustomers = await prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true },
      })
      
      const existingIds = new Set(existingCustomers.map(c => c.id))
      const invalidIds = customerIds.filter(id => !existingIds.has(id))
      
      if (invalidIds.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid customer IDs found',
            errors: invalidIds.map(id => ({ customerId: id, message: 'Customer not found' })),
          },
          { status: 400 }
        )
      }
      
      // Publish to Redis for async processing
      await RedisService.publishMessage(
        REDIS_CHANNELS.ORDER_BULK_INGESTION,
        {
          orders: validatedData.orders,
          userId: (session.user as { id?: string })?.id,
          source: 'api',
          batchId: crypto.randomUUID(),
        }
      )

      await RedisService.incrementMetric('api:orders:bulk:requests', 1)
      await RedisService.incrementMetric('api:orders:bulk:count', validatedData.orders.length)

      return NextResponse.json({
        success: true,
        message: `${validatedData.orders.length} orders queued for processing`,
        meta: {
          batchSize: validatedData.orders.length,
          totalAmount: validatedData.orders.reduce((sum, order) => sum + order.amount, 0),
          estimatedProcessingTime: Math.ceil(validatedData.orders.length / 20) + ' seconds',
        },
      })
    } else {
      const validatedData = orderSchema.parse(body)
      
      // Verify customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: validatedData.customerId },
        select: { id: true, name: true },
      })
      
      if (!customer) {
        return NextResponse.json(
          { success: false, message: 'Customer not found' },
          { status: 404 }
        )
      }
      
      // Publish to Redis for async processing
      await RedisService.publishMessage(
        REDIS_CHANNELS.ORDER_INGESTION,
        {
          ...validatedData,
          userId: (session.user as { id?: string })?.id,
          source: 'api',
          customerName: customer.name,
        }
      )

      await RedisService.incrementMetric('api:orders:single:requests', 1)

      return NextResponse.json({
        success: true,
        message: 'Order data queued for processing',
        data: {
          customerId: validatedData.customerId,
          amount: validatedData.amount,
          customerName: customer.name,
        },
      })
    }
  } catch (error: any) {
    console.error('Order API Error:', error)
    
    await RedisService.publishMessage(REDIS_CHANNELS.ERROR_HANDLING, {
      endpoint: '/api/orders',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    })

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
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const rateLimitResponse = await rateLimitStandard(request)
    if (rateLimitResponse) return rateLimitResponse

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const customerId = searchParams.get('customerId')
    const minAmount = searchParams.get('minAmount') ? parseFloat(searchParams.get('minAmount')!) : undefined
    const maxAmount = searchParams.get('maxAmount') ? parseFloat(searchParams.get('maxAmount')!) : undefined
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clause
    const whereClause: any = {}
    
    if (customerId) {
      whereClause.customerId = customerId
    }
    
    if (minAmount !== undefined || maxAmount !== undefined) {
      whereClause.amount = {}
      if (minAmount !== undefined) whereClause.amount.gte = minAmount
      if (maxAmount !== undefined) whereClause.amount.lte = maxAmount
    }
    
    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) whereClause.createdAt.gte = new Date(startDate)
      if (endDate) whereClause.createdAt.lte = new Date(endDate)
    }

    // Check cache
    const cacheKey = `orders:list:${JSON.stringify({ page, limit, whereClause })}`
    const cachedData = await RedisService.cacheGet(cacheKey)
    
    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: cachedData.orders,
        meta: cachedData.meta,
        cached: true,
      })
    }

    const total = await prisma.order.count({ where: whereClause })

    const orders = await prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    const meta = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    }

    const responseData = { orders, meta }
    await RedisService.cacheSet(cacheKey, responseData, 300)

    return NextResponse.json({
      success: true,
      data: orders,
      meta,
    })
  } catch (error: any) {
    console.error('Get Orders Error:', error)
    
    return NextResponse.json(
      { success: false, message: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}