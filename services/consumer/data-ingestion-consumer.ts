import { BaseConsumer } from './base-consumer'
import { REDIS_CHANNELS } from '../../lib/redis'
import { prisma } from '../../lib/prisma'

export class DataIngestionConsumer extends BaseConsumer {
  constructor() {
    super('DataIngestionConsumer', [
      REDIS_CHANNELS.CUSTOMER_INGESTION,
      REDIS_CHANNELS.CUSTOMER_BULK_INGESTION,
      REDIS_CHANNELS.ORDER_INGESTION,
      REDIS_CHANNELS.ORDER_BULK_INGESTION
    ])
  }

  protected async processMessage(channel: string, message: any): Promise<void> {
    const startTime = Date.now()
    
    try {
      switch (channel) {
        case REDIS_CHANNELS.CUSTOMER_INGESTION:
          await this.processCustomer(message)
          break
        case REDIS_CHANNELS.CUSTOMER_BULK_INGESTION:
          await this.processCustomerBulk(message)
          break
        case REDIS_CHANNELS.ORDER_INGESTION:
          await this.processOrder(message)
          break
        case REDIS_CHANNELS.ORDER_BULK_INGESTION:
          await this.processOrderBulk(message)
          break
        default:
          console.warn(`Unknown channel: ${channel}`)
      }
      
      await this.updateMetrics('data_ingestion:processing:time', Date.now() - startTime)
      
    } catch (error) {
      console.error(`❌ Data ingestion error for channel ${channel}:`, error)
      await this.updateMetrics('data_ingestion:errors', 1)
      throw error
    }
  }

  private async processCustomer(data: any): Promise<void> {
    try {
      const customer = await prisma.customer.upsert({
        where: { email: data.email },
        update: {
          name: data.name,
          totalSpent: data.totalSpent || 0,
          visits: data.visits || 0,
          lastVisit: data.lastVisit ? new Date(data.lastVisit) : null,
        },
        create: {
          name: data.name,
          email: data.email,
          totalSpent: data.totalSpent || 0,
          visits: data.visits || 0,
          lastVisit: data.lastVisit ? new Date(data.lastVisit) : null,
        },
      })

      await this.updateMetrics('customers:processed', 1)
      console.log(`Customer processed: ${customer.email}`)
      
    } catch (error) {
      await this.updateMetrics('customers:errors', 1)
      throw error
    }
  }

  private async processCustomerBulk(data: any): Promise<void> {
    const { customers, batchId } = data
    console.log(`Processing bulk customers - Batch: ${batchId}, Count: ${customers.length}`)
    
    try {
      const chunkSize = 50
      let processed = 0
      let errors = 0

      for (let i = 0; i < customers.length; i += chunkSize) {
        const chunk = customers.slice(i, i + chunkSize)
        
        try {
          await prisma.$transaction(async (tx) => {
            for (const customerData of chunk) {
              await tx.customer.upsert({
                where: { email: customerData.email },
                update: {
                  name: customerData.name,
                  totalSpent: customerData.totalSpent || 0,
                  visits: customerData.visits || 0,
                  lastVisit: customerData.lastVisit ? new Date(customerData.lastVisit) : null,
                },
                create: {
                  name: customerData.name,
                  email: customerData.email,
                  totalSpent: customerData.totalSpent || 0,
                  visits: customerData.visits || 0,
                  lastVisit: customerData.lastVisit ? new Date(customerData.lastVisit) : null,
                },
              })
            }
          })
          
          processed += chunk.length
        } catch (chunkError) {
          console.error(`Chunk processing failed:`, chunkError)
          errors += chunk.length
        }
      }

      await this.updateMetrics('customers:bulk:processed', processed)
      await this.updateMetrics('customers:bulk:errors', errors)
      
      console.log(`Bulk customer processing complete - Processed: ${processed}, Errors: ${errors}`)
      
    } catch (error) {
      await this.updateMetrics('customers:bulk:total_errors', 1)
      throw error
    }
  }

  private async processOrder(data: any): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            customerId: data.customerId,
            amount: data.amount,
          },
        })

        await tx.customer.update({
          where: { id: data.customerId },
          data: {
            totalSpent: { increment: data.amount },
            lastVisit: new Date(),
          },
        })

        console.log(`Order processed: ${order.id} - $${data.amount}`)
      })

      await this.updateMetrics('orders:processed', 1)
      await this.updateMetrics('revenue:total', data.amount, 'incrbyfloat')
      
    } catch (error) {
      await this.updateMetrics('orders:errors', 1)
      throw error
    }
  }

  private async processOrderBulk(data: any): Promise<void> {
    const { orders, batchId } = data
    console.log(`Processing bulk orders - Batch: ${batchId}, Count: ${orders.length}`)
    
    try {
      const chunkSize = 100
      let processed = 0
      let errors = 0
      let totalRevenue = 0

      for (let i = 0; i < orders.length; i += chunkSize) {
        const chunk = orders.slice(i, i + chunkSize)
        
        try {
          await prisma.$transaction(async (tx) => {
            for (const orderData of chunk) {
              await tx.order.create({
                data: {
                  customerId: orderData.customerId,
                  amount: orderData.amount,
                },
              })

              await tx.customer.update({
                where: { id: orderData.customerId },
                data: {
                  totalSpent: { increment: orderData.amount },
                  lastVisit: new Date(),
                },
              })
              
              totalRevenue += orderData.amount
            }
          })
          
          processed += chunk.length
        } catch (chunkError) {
          console.error(`Chunk processing failed:`, chunkError)
          errors += chunk.length
        }
      }

      await this.updateMetrics('orders:bulk:processed', processed)
      await this.updateMetrics('orders:bulk:errors', errors)
      await this.updateMetrics('revenue:bulk', totalRevenue, 'incrbyfloat')
      
      console.log(`Bulk order processing complete - Processed: ${processed}, Errors: ${errors}, Revenue: $${totalRevenue}`)
      
    } catch (error) {
      await this.updateMetrics('orders:bulk:total_errors', 1)
      throw error
    }
  }
}