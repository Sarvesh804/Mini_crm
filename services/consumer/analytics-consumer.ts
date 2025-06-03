import { BaseConsumer } from './base-consumer'
import { REDIS_CHANNELS, RedisService } from '../../lib/redis'

export class AnalyticsConsumer extends BaseConsumer {
  constructor() {
    super('AnalyticsConsumer', [REDIS_CHANNELS.ANALYTICS_UPDATE])
  }

  protected async processMessage(channel: string, message: any): Promise<void> {
    try {
      console.log(`📊 Processing analytics update: ${message.type}`)
      
      // Store analytics data in Redis for real-time dashboards
      const analyticsKey = `analytics:${message.type.toLowerCase()}:${new Date().toISOString().split('T')[0]}`
      
      await RedisService.publishMessage('analytics', {
        ...message,
        processedAt: new Date().toISOString(),
      })
      
      // Store in daily analytics lists
      await RedisService.lpush(analyticsKey, JSON.stringify({
        ...message,
        processedAt: new Date().toISOString(),
      }))
      
      // Keep only last 1000 entries
      await RedisService.ltrim(analyticsKey, 0, 999)
      
      // Set expiration (30 days)
      await RedisService.expire(analyticsKey, 30 * 24 * 60 * 60)
      
      // Update real-time counters based on analytics type
      switch (message.type) {
        case 'DELIVERY_RECEIPT':
          await this.updateMetrics(`daily:${message.status.toLowerCase()}`, 1)
          break
        case 'CAMPAIGN_COMPLETED':
          await this.updateMetrics('campaigns:completed', 1)
          break
        case 'CUSTOMER_ACTIVITY':
          await this.updateMetrics('customers:active', 1)
          break
      }
      
      await this.updateMetrics('analytics:updates:processed', 1)
      
    } catch (error) {
      console.error(`❌ Analytics update error:`, error)
      await this.updateMetrics('analytics:updates:errors', 1)
      throw error
    }
  }
}