import { BaseConsumer } from './base-consumer'
import { DeliveryReceiptHandler } from '../delivery-receipt-handler'
import { REDIS_CHANNELS } from '../../lib/redis'

export class DeliveryReceiptConsumer extends BaseConsumer {
  constructor() {
    super('DeliveryReceiptConsumer', [REDIS_CHANNELS.DELIVERY_RECEIPT])
  }

  protected async processMessage(channel: string, message: any): Promise<void> {
    const startTime = Date.now()
    
    try {
      console.log(`📧 Processing delivery receipt: ${message.messageId}`)
      
      // Validate message structure
      if (!message.messageId || !message.status) {
        throw new Error('Invalid delivery receipt message structure')
      }

      // Process delivery receipt using existing handler
      await DeliveryReceiptHandler.processDeliveryReceipt(message)
      
      // Update metrics
      await this.updateMetrics('receipts:processed', 1)
      await this.updateMetrics('receipts:processing:time', Date.now() - startTime)
      
      // Update delivery status metrics
      if (message.status === 'SENT') {
        await this.updateMetrics('delivery:receipts:sent', 1)
        if (message.cost) {
          await this.updateMetrics('delivery:costs:total', message.cost, 'incrbyfloat')
        }
      } else {
        await this.updateMetrics('delivery:receipts:failed', 1)
        await this.updateMetrics(`delivery:failures:${message.failureReason || 'unknown'}`, 1)
      }
      
      console.log(`✅ Delivery receipt processed: ${message.messageId} - ${message.status}`)
      
    } catch (error) {
      console.error(`❌ Delivery receipt processing error for ${message.messageId}:`, error)
      await this.updateMetrics('receipts:errors', 1)
      
      // Send to error handling
      await this.publishError({
        service: 'DeliveryReceiptConsumer',
        messageId: message.messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
        originalMessage: message
      })
      
      throw error
    }
  }
}