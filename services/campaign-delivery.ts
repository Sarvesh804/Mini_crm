import { prisma } from '@/lib/prisma'
import { RedisService, REDIS_CHANNELS } from '@/lib/redis'
import { VendorAPIService } from './vendor-api'

export class CampaignDeliveryService {
  static async processCampaignDelivery(data: any) {
    const { campaignId, rules, message, userId } = data
    const startTime = Date.now()
    
    try {
      console.log(`🎯 Starting campaign delivery for campaign: ${campaignId}`)
      
      // Get campaign from database
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { logs: true }
      })
      
      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`)
      }
      
      // Check if campaign is already processed
      if (campaign.logs.length > 0) {
        console.log(`⚠️ Campaign ${campaignId} already has delivery logs, skipping...`)
        return
      }
      
      // Build audience query
      const whereClause = this.buildWhereClause(rules)
      
      // Get target customers
      const customers = await prisma.customer.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          totalSpent: true,
          visits: true,
        }
      })
      
      console.log(`👥 Found ${customers.length} customers for campaign ${campaignId}`)
      
      if (customers.length === 0) {
        await this.markCampaignCompleted(campaignId, 0, 0, 0)
        return
      }
      
      // Create delivery logs with PENDING status
      const deliveryLogs = await Promise.all(
        customers.map(customer => 
          prisma.campaignLog.create({
            data: {
              campaignId,
              customerId: customer.id,
              status: 'PENDING',
              message: this.personalizeMessage(message, customer),
            }
          })
        )
      )
      
      console.log(`📝 Created ${deliveryLogs.length} delivery logs`)
      
      // Process deliveries in batches
      const batchSize = 50
      let totalSent = 0
      let totalFailed = 0
      
      for (let i = 0; i < deliveryLogs.length; i += batchSize) {
        const batch = deliveryLogs.slice(i, i + batchSize)
        
        try {
          const batchMessages = batch.map(log => ({
            customerId: log.customerId,
            customerEmail: customers.find(c => c.id === log.customerId)?.email || '',
            message: log.message,
          }))
          
          // Send via vendor API
          const results = await VendorAPIService.sendBulkMessages(batchMessages)
          
          // Update delivery logs with initial results
          for (let j = 0; j < batch.length; j++) {
            const log = batch[j]
            const result = results[j]
            
            await prisma.campaignLog.update({
              where: { id: log.id },
              data: {
                status: result.status,
                messageId: result.messageId,
                vendor: result.vendor,
                sentAt: result.status === 'SENT' ? result.timestamp : null,
                failureReason: result.failureReason,
                cost: result.cost,
              }
            })
            
            if (result.status === 'SENT') {
              totalSent++
            } else {
              totalFailed++
            }
          }
          
          console.log(`✅ Processed delivery batch ${Math.ceil((i + batchSize) / batchSize)} - ${totalSent} sent, ${totalFailed} failed`)
          
          // Update campaign progress
          await this.updateCampaignStats(campaignId, totalSent, totalFailed, deliveryLogs.length - totalSent - totalFailed)
          
        } catch (batchError) {
          console.error(`❌ Batch delivery failed:`, batchError)
          
          // Mark batch as failed
          await Promise.all(
            batch.map(log => 
              prisma.campaignLog.update({
                where: { id: log.id },
                data: {
                  status: 'FAILED',
                  failureReason: 'BATCH_PROCESSING_ERROR',
                }
              })
            )
          )
          
          totalFailed += batch.length
        }
        
        // Small delay between batches to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // Mark campaign as completed
      await this.markCampaignCompleted(campaignId, totalSent, totalFailed, 0)
      
      // Update metrics
      await RedisService.incrementMetric('campaigns:delivered:total', 1)
      await RedisService.incrementMetric('campaigns:messages:sent', totalSent)
      await RedisService.incrementMetric('campaigns:messages:failed', totalFailed)
      await RedisService.incrementMetric('campaigns:processing:time', Date.now() - startTime)
      
      console.log(`🎉 Campaign ${campaignId} delivery completed - Sent: ${totalSent}, Failed: ${totalFailed}, Duration: ${Date.now() - startTime}ms`)
      
    } catch (error) {
      console.error(`💥 Campaign delivery failed for ${campaignId}:`, error)
      
      // Mark campaign as failed
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'FAILED' }
      })
      
      await RedisService.incrementMetric('campaigns:failed:total', 1)
      throw error
    }
  }
  
  private static buildWhereClause(rules: any[]): any {
    if (rules.length === 0) return {}
    
    const conditions: any[] = []
    
    for (const rule of rules) {
      let condition: any = {}
      
      switch (rule.field) {
        case 'totalSpent':
          condition.totalSpent = this.buildOperatorCondition(rule.operator, rule.value)
          break
        case 'visits':
          condition.visits = this.buildOperatorCondition(rule.operator, rule.value)
          break
        case 'lastVisit':
          if (rule.operator === 'days_ago') {
            const daysAgo = new Date()
            daysAgo.setDate(daysAgo.getDate() - parseInt(rule.value))
            condition.lastVisit = { lt: daysAgo }
          } else {
            condition.lastVisit = this.buildOperatorCondition(rule.operator, new Date(rule.value))
          }
          break
        case 'createdAt':
          condition.createdAt = this.buildOperatorCondition(rule.operator, new Date(rule.value))
          break
      }
      
      conditions.push(condition)
    }
    
    if (conditions.length === 1) {
      return conditions[0]
    }
    
    return { AND: conditions }
  }
  
  private static buildOperatorCondition(operator: string, value: any): any {
    switch (operator) {
      case '>':
        return { gt: value }
      case '<':
        return { lt: value }
      case '>=':
        return { gte: value }
      case '<=':
        return { lte: value }
      case '=':
        return { equals: value }
      case '!=':
        return { not: value }
      default:
        return { equals: value }
    }
  }
  
  private static personalizeMessage(template: string, customer: any): string {
    return template
      .replace(/{customerName}/g, customer.name)
      .replace(/{customerEmail}/g, customer.email)
      .replace(/{totalSpent}/g, `$${customer.totalSpent.toFixed(2)}`)
      .replace(/{visits}/g, customer.visits.toString())
  }
  
  private static async updateCampaignStats(campaignId: string, sent: number, failed: number, pending: number) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: pending > 0 ? 'ACTIVE' : 'COMPLETED',
        // Store stats in a JSON field if available, or create separate fields
      }
    })
  }
  
  private static async markCampaignCompleted(campaignId: string, sent: number, failed: number, pending: number) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      }
    })
    
    console.log(`✅ Campaign ${campaignId} marked as completed`)
  }
}