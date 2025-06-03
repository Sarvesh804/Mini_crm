import { BaseConsumer } from './base-consumer'
import { CampaignDeliveryService } from '../campaign-delivery'
import { REDIS_CHANNELS } from '../../lib/redis'

export class CampaignConsumer extends BaseConsumer {
  constructor() {
    super('CampaignConsumer', [REDIS_CHANNELS.CAMPAIGN_DELIVERY])
  }

  protected async processMessage(channel: string, message: any): Promise<void> {
    const startTime = Date.now()
    
    try {
      console.log(`🎯 Processing campaign delivery: ${message.campaignId}`)
      
      // Validate message structure
      if (!message.campaignId || !message.rules || !message.message) {
        throw new Error('Invalid campaign delivery message structure')
      }

      // Process campaign delivery using existing service
      await CampaignDeliveryService.processCampaignDelivery(message)
      
      // Update metrics
      await this.updateMetrics('campaigns:processed', 1)
      await this.updateMetrics('campaigns:processing:time', Date.now() - startTime)
      
      console.log(`✅ Campaign delivery completed: ${message.campaignId} (${Date.now() - startTime}ms)`)
      
    } catch (error) {
      console.error(`❌ Campaign delivery error for ${message.campaignId}:`, error)
      await this.updateMetrics('campaigns:errors', 1)
      
      // Send to error handling
      await this.publishError({
        service: 'CampaignConsumer',
        campaignId: message.campaignId,
        error: error instanceof Error ? error.message : 'Unknown error',
        originalMessage: message
      })
      
      throw error
    }
  }
}