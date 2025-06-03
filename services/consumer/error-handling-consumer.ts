import { BaseConsumer } from './base-consumer'
import { REDIS_CHANNELS, RedisService } from '../../lib/redis'

export class ErrorHandlingConsumer extends BaseConsumer {
  constructor() {
    super('ErrorHandlingConsumer', [REDIS_CHANNELS.ERROR_HANDLING])
  }

  protected async processMessage(channel: string, message: any): Promise<void> {
    try {
      console.error(`🚨 Application Error from ${message.source || 'Unknown'}:`, {
        service: message.service,
        error: message.error,
        timestamp: message.timestamp
      })
      
      // Store error in Redis for monitoring (with TTL)
      const errorKey = `errors:${new Date().toISOString().split('T')[0]}:${message.timestamp}`
      await RedisService.setex(errorKey, 86400 * 7, JSON.stringify(message)) // Keep for 7 days
      
      // Update error metrics
      await this.updateMetrics('errors:total', 1)
      await this.updateMetrics(`errors:${message.service || 'unknown'}`, 1)
      
      // If it's a critical error, you could add alerting here
      if (message.critical) {
        console.error(`🔥 CRITICAL ERROR from ${message.service}:`, message.error)
        // Add your alerting logic here (email, Slack, etc.)
      }
      
    } catch (error) {
      console.error('💥 Error processing error:', error)
    }
  }
}