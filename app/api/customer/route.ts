import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RedisService, REDIS_CHANNELS } from '@/lib/redis'
import { customerSchema, customerBulkSchema } from '@/lib/validation/customer.schema'
import { createRateLimit, API_RATE_LIMITS } from '@/lib/rate-limit'

// Rate limiting middleware
const rateLimitStandard = createRateLimit(API_RATE_LIMITS.STANDARD)
const rateLimitBulk = createRateLimit(API_RATE_LIMITS.BULK)

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Apply rate limiting
    const rateLimitResponse = await rateLimitStandard(request)
    if (rateLimitResponse) return rateLimitResponse

    const body = await request.json()
    
    // Check if it's a bulk operation
    const isBulk = Array.isArray(body.customers)
    
    if (isBulk) {
      // Apply bulk rate limiting
      const bulkRateLimitResponse = await rateLimitBulk(request)
      if (bulkRateLimitResponse) return bulkRateLimitResponse
      
      // Validate bulk data
      const validatedData = customerBulkSchema.parse(body)
      
      // Publish to Redis for async processing
      await RedisService.publishMessage(
        REDIS_CHANNELS.CUSTOMER_BULK_INGESTION,
        {
          customers: validatedData.customers,
          userId: (session.user as { id: string })?.id,
          source: 'api',
          batchId: crypto.randomUUID(),
        }
      )

      // Update API metrics
      await RedisService.incrementMetric('api:customers:bulk:requests', 1)
      await RedisService.incrementMetric('api:customers:bulk:count', validatedData.customers.length)

      return NextResponse.json({
        success: true,
        message: `${validatedData.customers.length} customers queued for processing`,
        meta: {
          batchSize: validatedData.customers.length,
          estimatedProcessingTime: Math.ceil(validatedData.customers.length / 10) + ' seconds',
        },
      })
    } else {
      // Single customer processing
      const validatedData = customerSchema.parse(body)
      
      // Publish to Redis for async processing
      await RedisService.publishMessage(
        REDIS_CHANNELS.CUSTOMER_INGESTION,
        {
          ...validatedData,
          userId: (session.user as {id:string})?.id,
          source: 'api',
        }
      )

      // Update API metrics
      await RedisService.incrementMetric('api:customers:single:requests', 1)

      return NextResponse.json({
        success: true,
        message: 'Customer data queued for processing',
        data: { email: validatedData.email },
      })
    }
  } catch (error: any) {
    // Log error for monitoring
    console.error('Customer API Error:', error)
    
    // Publish error to Redis for analysis
    await RedisService.publishMessage(REDIS_CHANNELS.ERROR_HANDLING, {
      endpoint: '/api/customers',
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

    // Apply rate limiting
    const rateLimitResponse = await rateLimitStandard(request)
    if (rateLimitResponse) return rateLimitResponse

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Check cache first
    const cacheKey = `customers:list:${page}:${limit}:${search}:${sortBy}:${sortOrder}`
    const cachedData = await RedisService.cacheGet(cacheKey)
    
    if (cachedData) {
      await RedisService.incrementMetric('api:customers:cache:hits', 1)
      return NextResponse.json({
        success: true,
        data: cachedData.customers,
        meta: cachedData.meta,
        cached: true,
      })
    }

    // Build query
    const whereClause = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    // Get total count
    const total = await prisma.customer.count({ where: whereClause })

    // Get customers
    const customers = await prisma.customer.findMany({
      where: whereClause,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        orders: {
          select: {
            id: true,
            amount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            orders: true,
            campaignLogs: true,
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

    const responseData = { customers, meta }

    // Cache the result for 5 minutes
    await RedisService.cacheSet(cacheKey, responseData, 300)
    await RedisService.incrementMetric('api:customers:cache:misses', 1)

    return NextResponse.json({
      success: true,
      data: customers,
      meta,
    })
  } catch (error: any) {
    console.error('Get Customers Error:', error)
    
    return NextResponse.json(
      { success: false, message: 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}