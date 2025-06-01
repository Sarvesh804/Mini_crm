import redis, { REDIS_CHANNELS } from '../lib/redis'
import { DataConsumerService } from './consumer/consumer-service'
import { CampaignDeliveryService } from './campaign-delivery'
import { DeliveryReceiptHandler } from './delivery-receipt-handler'

export class EnhancedConsumerService extends DataConsumerService {
  constructor() {
    super()
    
    // Add new processors for campaign delivery
    this.processors.set(REDIS_CHANNELS.CAMPAIGN_DELIVERY, this.processCampaignDelivery.bind(this))
    this.processors.set(REDIS_CHANNELS.DELIVERY_RECEIPT, this.processDeliveryReceipt.bind(this))
    this.processors.set(REDIS_CHANNELS.ANALYTICS_UPDATE, this.processAnalyticsUpdate.bind(this))
  }

  private async processCampaignDelivery(data: any) {
    const startTime = Date.now()
    
    try {
      console.log(`🎯 Processing campaign delivery: ${data.campaignId}`)
      
      await CampaignDeliveryService.processCampaignDelivery(data)
      
      // Update metrics
      await redis.incrby('metrics:campaigns:processed', 1)
      await redis.incrby('metrics:processing:time:campaigns', Date.now() - startTime)
      
      console.log(`✅ Campaign delivery completed: ${data.campaignId}`)
      
    } catch (error) {
      console.error('❌ Campaign delivery error:', error)
      await redis.incrby('metrics:campaigns:errors', 1)
      throw error
    }
  }

  private async processDeliveryReceipt(data: any) {
    const startTime = Date.now()
    
    try {
      console.log(`📧 Processing delivery receipt: ${data.messageId}`)
      
      await DeliveryReceiptHandler.processDeliveryReceipt(data)
      
      // Update metrics
      await redis.incrby('metrics:receipts:processed', 1)
      await redis.incrby('metrics:processing:time:receipts', Date.now() - startTime)
      
    } catch (error) {
      console.error('❌ Delivery receipt processing error:', error)
      await redis.incrby('metrics:receipts:errors', 1)
      throw error
    }
  }

  private async processAnalyticsUpdate(data: any) {
    try {
      console.log(`📊 Processing analytics update: ${data.type}`)
      
      // Store analytics data in Redis for real-time dashboards
      const analyticsKey = `analytics:${data.type.toLowerCase()}:${new Date().toISOString().split('T')[0]}`
      
      await redis.lpush(analyticsKey, JSON.stringify({
        ...data,
        processedAt: new Date().toISOString(),
      }))
      
      // Keep only last 1000 entries
      await redis.ltrim(analyticsKey, 0, 999)
      
      // Set expiration (30 days)
      await redis.expire(analyticsKey, 30 * 24 * 60 * 60)
      
      // Update real-time counters
      if (data.type === 'DELIVERY_RECEIPT') {
        await redis.incrby(`analytics:daily:${data.status.toLowerCase()}`, 1)
      }
      
    } catch (error) {
      console.error('❌ Analytics update error:', error)
    }
  }

  async getEnhancedMetrics() {
    try {
      const baseMetrics = await this.getMetrics()
      
      const enhancedMetrics = await redis.mget(
        'metrics:campaigns:processed',
        'metrics:receipts:processed',
        'metrics:campaigns:errors',
        'metrics:receipts:errors',
        'metrics:processing:time:campaigns',
        'metrics:processing:time:receipts',
        'delivery:receipts:sent',
        'delivery:receipts:failed',
        'delivery:costs:total'
      )

      return {
        ...baseMetrics,
        campaignsProcessed: parseInt(enhancedMetrics[0] || '0'),
        receiptsProcessed: parseInt(enhancedMetrics[1] || '0'),
        campaignErrors: parseInt(enhancedMetrics[2] || '0'),
        receiptErrors: parseInt(enhancedMetrics[3] || '0'),
        avgCampaignProcessingTime: parseInt(enhancedMetrics[4] || '0'),
        avgReceiptProcessingTime: parseInt(enhancedMetrics[5] || '0'),
        totalDelivered: parseInt(enhancedMetrics[6] || '0'),
        totalFailed: parseInt(enhancedMetrics[7] || '0'),
        totalCosts: parseFloat(enhancedMetrics[8] || '0'),
      }
    } catch (error) {
      console.error('❌ Error fetching enhanced metrics:', error)
      return null
    }
  }

  async getRealtimeAnalytics(): Promise<any> {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const [deliveryData, campaignData, analyticsData] = await Promise.all([
        redis.mget(
          `analytics:daily:sent`,
          `analytics:daily:failed`,
          'delivery:costs:total'
        ),
        redis.get(`analytics:campaign_completed:${today}`),
        redis.lrange(`analytics:delivery_receipt:${today}`, 0, 99)
      ])

      return {
        dailyDeliveries: {
          sent: parseInt(deliveryData[0] || '0'),
          failed: parseInt(deliveryData[1] || '0'),
          totalCost: parseFloat(deliveryData[2] || '0'),
        },
        recentCampaigns: campaignData ? JSON.parse(campaignData) : null,
        recentActivity: analyticsData.map(item => JSON.parse(item)).slice(0, 10),
        lastUpdated: new Date().toISOString(),
      }
    } catch (error) {
      console.error('❌ Error fetching realtime analytics:', error)
      return null
    }
  }
}