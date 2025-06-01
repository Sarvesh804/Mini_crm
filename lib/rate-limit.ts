import { NextRequest, NextResponse } from 'next/server'
import { RedisService } from '@/lib/redis'
import redis from '@/lib/redis'

interface RateLimitConfig {
  requests: number
  window: number // in seconds
  message?: string
}

export function createRateLimit(config: RateLimitConfig) {
  return async function rateLimit(
    request: NextRequest,
    context: { params?: any }
  ): Promise<NextResponse | null> {
    try {
      // Get client identifier (IP or user ID)
      const clientId = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      request.ip || 
                      'anonymous'
      
      const key = `${process.env.REDIS_KEYS?.RATE_LIMIT_PREFIX || 'rate_limit:'}${clientId}:${request.nextUrl.pathname}`
      
      // Get current count
      const current = await RedisService.cacheGet(key) || 0
      
      if (current >= config.requests) {
        return NextResponse.json(
          {
            success: false,
            message: config.message || 'Rate limit exceeded. Please try again later.',
            retryAfter: config.window,
          },
          { status: 429 }
        )
      }
      
      // Increment counter
      await RedisService.incrementMetric(key, 1)
      
      // Set expiration if this is the first request
      if (current === 0) {
        await redis.expire(key, config.window)
      }
      
      return null // Continue to next middleware/handler
    } catch (error) {
      console.error('Rate limiting error:', error)
      return null // Allow request on error
    }
  }
}

// Common rate limit configurations
export const API_RATE_LIMITS = {
  STANDARD: { requests: 100, window: 60 }, // 100 requests per minute
  BULK: { requests: 10, window: 60 }, // 10 bulk operations per minute
  AUTH: { requests: 5, window: 300 }, // 5 auth attempts per 5 minutes
} as const