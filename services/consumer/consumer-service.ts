import redis, { REDIS_CHANNELS } from '../../lib/redis'
import { prisma } from '../../lib/prisma'
import { BulkCustomerPayload, BulkOrderPayload, CustomerPayload, ErrorPayload, OrderPayload } from '@/types'


export class DataConsumerService {
  private isRunning = false
  private processors = new Map<string, (data:any) => Promise<void>>()

  constructor() {
    // Register all processors
    this.processors.set(REDIS_CHANNELS.CUSTOMER_INGESTION, this.processCustomer.bind(this))
    this.processors.set(REDIS_CHANNELS.CUSTOMER_BULK_INGESTION, this.processCustomerBulk.bind(this))
    this.processors.set(REDIS_CHANNELS.ORDER_INGESTION, this.processOrder.bind(this))
    this.processors.set(REDIS_CHANNELS.ORDER_BULK_INGESTION, this.processOrderBulk.bind(this))
    this.processors.set(REDIS_CHANNELS.ERROR_HANDLING, this.processError.bind(this))
  }

  async start() {
    if (this.isRunning) {
      console.log('Consumer service already running')
      return
    }

    this.isRunning = true
    console.log('Starting Data Consumer Service...')

    // Subscribe to all channels
    const channels = Array.from(this.processors.keys())
    await redis.subscribe(...channels)

    redis.on('message', async (channel, message) => {
      try {
        const data = JSON.parse(message)
        const processor = this.processors.get(channel)
        
        if (processor) {
          await processor(data)
          console.log(`Processed message from ${channel}`)
        } else {
          console.warn(`No processor found for channel: ${channel}`)
        }
      } catch (error) {
        console.error(`Error processing message from ${channel}:`, error)
        
        // Send to error handling
        await this.processError({
          channel,
          message,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        })
      }
    })

    console.log(` Subscribed to ${channels.length} Redis channels`)
    console.log(' Data Consumer Service is ready!')
  }



  private async processCustomer(data: CustomerPayload) {
    const startTime = Date.now()
    
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

      // Update metrics
      await redis.incrby('metrics:customers:processed', 1)
      await redis.incrby('metrics:processing:time:customers', Date.now() - startTime)
      
      console.log(`Customer processed: ${customer.email}`)
    } catch (error) {
      console.error('Customer processing error:', error)
      await redis.incrby('metrics:customers:errors', 1)
      throw error
    }
  }



  private async processCustomerBulk(data: BulkCustomerPayload) {
    const startTime = Date.now()
    const { customers, batchId } = data
    
    try {
      console.log(`Processing bulk customers - Batch: ${batchId}, Count: ${customers.length}`)
      
      // Process in chunks of 50 to avoid database timeout
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
          console.log(`Processed chunk ${Math.ceil((i + chunkSize) / chunkSize)} - ${processed}/${customers.length} customers`)
        } catch (chunkError) {
          console.error(`Chunk ${Math.ceil((i + chunkSize) / chunkSize)} failed:`, chunkError)
          errors += chunk.length
        }
      }

      // Update metrics
      await redis.incrby('metrics:customers:bulk:processed', processed)
      await redis.incrby('metrics:customers:bulk:errors', errors)
      await redis.incrby('metrics:processing:time:bulk_customers', Date.now() - startTime)
      
      console.log(`Bulk customer processing complete - Processed: ${processed}, Errors: ${errors}`)
    } catch (error) {
      console.error('Bulk customer processing error:', error)
      await redis.incrby('metrics:customers:bulk:total_errors', 1)
      throw error
    }
  }

  private async processOrder(data: OrderPayload) {
    const startTime = Date.now()
    
    try {
      await prisma.$transaction(async (tx) => {
        // Create order
        const order = await tx.order.create({
          data: {
            customerId: data.customerId,
            amount: data.amount,
          },
        })

        // Update customer statistics
        await tx.customer.update({
          where: { id: data.customerId },
          data: {
            totalSpent: { increment: data.amount },
            lastVisit: new Date(),
          },
        })

        console.log(`Order processed: ${order.id} - $${data.amount}`)
      })

      // Update metrics
      await redis.incrby('metrics:orders:processed', 1)
      await redis.incrbyfloat('metrics:revenue:total', data.amount)
      await redis.incrby('metrics:processing:time:orders', Date.now() - startTime)
    } catch (error) {
      console.error('Order processing error:', error)
      await redis.incrby('metrics:orders:errors', 1)
      throw error
    }
  }

  private async processOrderBulk(data: BulkOrderPayload) {
    const startTime = Date.now()
    const { orders, batchId } = data
    
    try {
      console.log(`Processing bulk orders - Batch: ${batchId}, Count: ${orders.length}`)
      
      const chunkSize = 100
      let processed = 0
      let errors = 0
      let totalRevenue = 0

      for (let i = 0; i < orders.length; i += chunkSize) {
        const chunk = orders.slice(i, i + chunkSize)
        
        try {
          await prisma.$transaction(async (tx) => {
            for (const orderData of chunk) {
              // Create order
              await tx.order.create({
                data: {
                  customerId: orderData.customerId,
                  amount: orderData.amount,
                },
              })

              // Update customer
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
          console.log(`Processed chunk ${Math.ceil((i + chunkSize) / chunkSize)} - ${processed}/${orders.length} orders`)
        } catch (chunkError) {
          console.error(`Chunk ${Math.ceil((i + chunkSize) / chunkSize)} failed:`, chunkError)
          errors += chunk.length
        }
      }

      // Update metrics
      await redis.incrby('metrics:orders:bulk:processed', processed)
      await redis.incrby('metrics:orders:bulk:errors', errors)
      await redis.incrbyfloat('metrics:revenue:bulk', totalRevenue)
      await redis.incrby('metrics:processing:time:bulk_orders', Date.now() - startTime)
      
      console.log(`Bulk order processing complete - Processed: ${processed}, Errors: ${errors}, Revenue: $${totalRevenue}`)
    } catch (error) {
      console.error('Bulk order processing error:', error)
      await redis.incrby('metrics:orders:bulk:total_errors', 1)
      throw error
    }
  }

  private async processError(data: ErrorPayload) {
    try {
      // Log error to console
      console.error('🚨 Application Error:', data)
      
      // Store error in Redis for monitoring (with TTL)
      const errorKey = `errors:${new Date().toISOString().split('T')[0]}:${data.timestamp}`
      await redis.setex(errorKey, 86400 * 7, JSON.stringify(data)) // Keep for 7 days
      
      // Update error metrics
      await redis.incrby('metrics:errors:total', 1)
      await redis.incrby(`metrics:errors:${data.channel || 'unknown'}`, 1)
    } catch (error) {
      console.error(' Error processing error:', error)
    }
  }

  async stop() {
    if (!this.isRunning) return
    
    console.log('Stopping Data Consumer Service...')
    this.isRunning = false
    
    await redis.unsubscribe()
    console.log('Data Consumer Service stopped')
  }

  async getMetrics() {
    try {
      const metrics = await redis.mget(
        'metrics:customers:processed',
        'metrics:orders:processed',
        'metrics:revenue:total',
        'metrics:errors:total',
        'metrics:customers:bulk:processed',
        'metrics:orders:bulk:processed'
      )

      return {
        customersProcessed: parseInt(metrics[0] || '0'),
        ordersProcessed: parseInt(metrics[1] || '0'),
        totalRevenue: parseFloat(metrics[2] || '0'),
        totalErrors: parseInt(metrics[3] || '0'),
        bulkCustomersProcessed: parseInt(metrics[4] || '0'),
        bulkOrdersProcessed: parseInt(metrics[5] || '0'),
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
      return null
    }
  }
}