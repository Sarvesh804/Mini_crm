import { RedisService, REDIS_CHANNELS } from '@/lib/redis'

export interface DeliveryResult {
  messageId: string
  customerId: string
  status: 'SENT' | 'FAILED'
  vendor: string
  timestamp: Date
  failureReason?: string
  cost?: number
}

export interface VendorResponse {
  success: boolean
  messageId: string
  timestamp: string
  cost: number
  failureReason?: string
}

export interface vendors {
  name: string
  successRate: number
  avgDelay: number
  costPerMessage: number
  status: 'ACTIVE' | 'INACTIVE'
  lastUsed: string
}

export class VendorAPIService {
  private static vendors = [
    { 
      name: 'TwilioSim', 
      successRate: 0.95, 
      avgDelay: 500, 
      costPerMessage: 0.05,
      commonErrors: ['INVALID_NUMBER', 'RATE_LIMIT', 'NETWORK_ERROR']
    },
    { 
      name: 'SendGridSim', 
      successRate: 0.92, 
      avgDelay: 300, 
      costPerMessage: 0.03,
      commonErrors: ['BOUNCE', 'SPAM_FILTER', 'INVALID_EMAIL']
    },
    { 
      name: 'AmazonSESSim', 
      successRate: 0.97, 
      avgDelay: 400, 
      costPerMessage: 0.04,
      commonErrors: ['SUPPRESSION_LIST', 'QUOTA_EXCEEDED', 'REPUTATION_ISSUE']
    }
  ]

  static async sendMessage(
    customerId: string, 
    customerEmail: string, 
    message: string, 
    vendor?: string
  ): Promise<DeliveryResult> {
    // Select random vendor if not specified
    const selectedVendor = vendor 
      ? this.vendors.find(v => v.name === vendor) 
      : this.vendors[Math.floor(Math.random() * this.vendors.length)]
    
    if (!selectedVendor) {
      throw new Error('Invalid vendor specified')
    }

    // Simulate network delay
    const delay = selectedVendor.avgDelay + (Math.random() * 200 - 100)
    await new Promise(resolve => setTimeout(resolve, delay))

    // Generate unique message ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Simulate success/failure based on vendor success rate
    const isSuccess = Math.random() < selectedVendor.successRate

    const result: DeliveryResult = {
      messageId,
      customerId,
      vendor: selectedVendor.name,
      timestamp: new Date(),
      cost: selectedVendor.costPerMessage,
      status: isSuccess ? 'SENT' : 'FAILED',
    }

    if (!isSuccess) {
      // Random failure reason
      const errorIndex = Math.floor(Math.random() * selectedVendor.commonErrors.length)
      result.failureReason = selectedVendor.commonErrors[errorIndex]
    }

    // Simulate vendor webhook delay (2-5 seconds)
    setTimeout(async () => {
      await this.simulateWebhookDelivery(result)
    }, 2000 + Math.random() * 3000)

    return result
  }

  static async sendBulkMessages(
    messages: Array<{
      customerId: string
      customerEmail: string
      message: string
    }>,
    vendor?: string
  ): Promise<DeliveryResult[]> {
    console.log(`🚀 Sending ${messages.length} messages via bulk API...`)
    
    const results: DeliveryResult[] = []
    const batchSize = 10 // Process in batches to simulate real API limits
    
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize)
      
      // Simulate batch processing delay
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const batchResults = await Promise.all(
        batch.map(msg => this.sendMessage(msg.customerId, msg.customerEmail, msg.message, vendor))
      )
      
      results.push(...batchResults)
      
      console.log(`✅ Processed batch ${Math.ceil((i + batchSize) / batchSize)} - ${Math.min(i + batchSize, messages.length)}/${messages.length} messages`)
    }
    
    return results
  }

  private static async simulateWebhookDelivery(result: DeliveryResult) {
    try {
      // Publish delivery receipt to Redis
      await RedisService.publishMessage(REDIS_CHANNELS.DELIVERY_RECEIPT, {
        messageId: result.messageId,
        customerId: result.customerId,
        status: result.status,
        vendor: result.vendor,
        timestamp: result.timestamp.toISOString(),
        failureReason: result.failureReason,
        cost: result.cost,
        webhookSource: 'vendor_simulation',
      })
      
      console.log(`📧 Webhook delivered for message ${result.messageId} - Status: ${result.status}`)
    } catch (error) {
      console.error('❌ Failed to send webhook:', error)
    }
  }

  static async getVendorStats(): Promise<vendors[]> {
    return this.vendors.map(vendor => ({
      name: vendor.name,
      successRate: vendor.successRate,
      avgDelay: vendor.avgDelay,
      costPerMessage: vendor.costPerMessage,
      status: 'ACTIVE',
      lastUsed: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    }))
  }

  static async testVendorConnection(vendorName: string): Promise<boolean> {
    const vendor = this.vendors.find(v => v.name === vendorName)
    if (!vendor) return false
    
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, vendor.avgDelay))
    
    // 5% chance of connection failure
    return Math.random() > 0.05
  }
}