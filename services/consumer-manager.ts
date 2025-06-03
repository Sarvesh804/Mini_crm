import { CampaignConsumer } from './consumer/campaign-consumer'
import { DataIngestionConsumer } from './consumer/data-ingestion-consumer'
import { DeliveryReceiptConsumer } from './consumer/delivery-receipt-consumer'
import { AnalyticsConsumer } from './consumer/analytics-consumer'
import { ErrorHandlingConsumer } from './consumer/error-handling-consumer'
import { RedisService } from '../lib/redis'

export class ConsumerManager {
  private consumers: Map<string, any> = new Map()
  private isRunning = false

  constructor() {
    // Initialize all consumer services
    this.consumers.set('campaign', new CampaignConsumer())
    this.consumers.set('data-ingestion', new DataIngestionConsumer())
    this.consumers.set('delivery-receipt', new DeliveryReceiptConsumer())
    this.consumers.set('analytics', new AnalyticsConsumer())
    this.consumers.set('error-handling', new ErrorHandlingConsumer())
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Consumer manager already running')
      return
    }

    console.log('🎬 Starting all consumer services...')
    this.isRunning = true

    // Start all consumers in parallel
    const startPromises = Array.from(this.consumers.entries()).map(async ([name, consumer]) => {
      try {
        await consumer.start()
        console.log(`✅ ${name} consumer started`)
      } catch (error) {
        console.error(`❌ Failed to start ${name} consumer:`, error)
        throw error
      }
    })

    await Promise.all(startPromises)
    console.log('🎉 All consumer services started successfully')
  }

  async shutdown(): Promise<void> {
    if (!this.isRunning) return

    console.log('🛑 Shutting down all consumer services...')
    this.isRunning = false

    // Stop all consumers in parallel
    const stopPromises = Array.from(this.consumers.entries()).map(async ([name, consumer]) => {
      try {
        await consumer.stop()
        console.log(`✅ ${name} consumer stopped`)
      } catch (error) {
        console.error(`❌ Error stopping ${name} consumer:`, error)
      }
    })

    await Promise.all(stopPromises)
    console.log('✅ All consumer services stopped')
  }

  async getSystemMetrics(): Promise<any> {
    try {
      const metrics = await RedisService.getMetrics()
      
      return {
        campaigns: {
          processed: metrics.campaignsProcessed || 0,
          active: metrics.activeCampaigns || 0,
          completed: metrics.completedCampaigns || 0
        },
        messages: {
          sent: metrics.messagesSent || 0,
          failed: metrics.messagesFailed || 0,
          pending: metrics.messagesPending || 0
        },
        customers: {
          processed: metrics.customersProcessed || 0,
          active: metrics.activeCustomers || 0
        },
        orders: {
          processed: metrics.ordersProcessed || 0
        },
        revenue: {
          total: metrics.totalRevenue || 0
        },
        costs: {
          total: metrics.totalCosts || 0
        },
        performance: {
          avgCampaignTime: metrics.avgCampaignProcessingTime || 0,
          avgReceiptTime: metrics.avgReceiptProcessingTime || 0
        }
      }
    } catch (error) {
      console.error('Error fetching system metrics:', error)
      return {
        campaigns: { processed: 0, active: 0, completed: 0 },
        messages: { sent: 0, failed: 0, pending: 0 },
        customers: { processed: 0, active: 0 },
        orders: { processed: 0 },
        revenue: { total: 0 },
        costs: { total: 0 },
        performance: { avgCampaignTime: 0, avgReceiptTime: 0 }
      }
    }
  }

  getConsumerStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {}
    for (const [name, consumer] of this.consumers) {
      status[name] = consumer.isRunning || false
    }
    return status
  }
}