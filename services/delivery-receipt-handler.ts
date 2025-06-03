import { prisma } from '@/lib/prisma'
import { RedisService, REDIS_CHANNELS } from '@/lib/redis'
import { geminiService } from '@/lib/ai/gemini'

export class DeliveryReceiptHandler {
  static async processDeliveryReceipt(data: any) {
    const { messageId, customerId, status, vendor, timestamp, failureReason, cost } = data
    
    try {
      console.log(`📧 Processing delivery receipt: ${messageId} - Status: ${status}`)
      
      // Find the campaign log entry
      const campaignLog = await prisma.campaignLog.findFirst({
        where: { messageId },
        include: {
          campaign: true,
          customer: true,
        }
      })
      
      if (!campaignLog) {
        console.warn(`⚠️ Campaign log not found for message ID: ${messageId}`)
        return
      }
      
      // Update the campaign log with final delivery status
      const updatedLog = await prisma.campaignLog.update({
        where: { id: campaignLog.id },
        data: {
          status: status as 'SENT' | 'FAILED',
          vendor,
          deliveredAt: status === 'SENT' ? new Date(timestamp) : null,
          failureReason,
          cost: cost || 0,
          webhookReceivedAt: new Date(),
        }
      })
      
      // Update customer last contact
      if (status === 'SENT') {
        await prisma.customer.update({
          where: { id: customerId },
          data: { lastVisit: new Date(timestamp) }
        })
      }
      
      // Update Redis metrics
      if (status === 'SENT') {
        await RedisService.incrementMetric('delivery:receipts:sent', 1)
        await RedisService.incrbyfloat('delivery:costs:total', cost || 0)
      } else {
        await RedisService.incrementMetric('delivery:receipts:failed', 1)
        await RedisService.incrementMetric(`delivery:failures:${failureReason || 'unknown'}`, 1)
      }
      
      // Check if campaign is completed
      await this.checkCampaignCompletion(campaignLog.campaignId)
      
      // Trigger real-time updates
      await RedisService.publishMessage(REDIS_CHANNELS.ANALYTICS_UPDATE, {
        type: 'DELIVERY_RECEIPT',
        campaignId: campaignLog.campaignId,
        customerId,
        status,
        timestamp: new Date().toISOString(),
      })
      
      console.log(`✅ Delivery receipt processed for message ${messageId}`)
      
    } catch (error) {
      console.error(`❌ Failed to process delivery receipt for ${messageId}:`, error)
      
      // Log error for monitoring
      await RedisService.publishMessage(REDIS_CHANNELS.ERROR_HANDLING, {
        service: 'DeliveryReceiptHandler',
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      })
    }
  }
  
  private static async checkCampaignCompletion(campaignId: string) {
    try {
      // Get campaign status
      const campaignStats = await prisma.campaignLog.groupBy({
        by: ['status'],
        where: { campaignId },
        _count: { status: true }
      })
      
      const stats = campaignStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status
        return acc
      }, {} as Record<string, number>)
      
      const total = Object.values(stats).reduce((sum, count) => sum + count, 0)
      const pending = stats.PENDING || 0
      
      // If no pending messages, mark campaign as completed
      if (pending === 0 && total > 0) {
        const campaign = await prisma.campaign.update({
          where: { id: campaignId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
          include: {
            campaignLogs: {
              select: {
                status: true,
                cost: true,
              }
            }
          }
        })
        
        // Calculate final stats
        const sent = stats.SENT || 0
        const failed = stats.FAILED || 0
        const totalCost = campaign.campaignLogs.reduce((sum, log) => sum + (log.cost ? Number(log.cost) : 0), 0)
        const successRate = total > 0 ? ((sent / total) * 100).toFixed(1) : '0'
        
        console.log(`🎉 Campaign ${campaignId} completed - Sent: ${sent}, Failed: ${failed}, Success Rate: ${successRate}%, Cost: $${totalCost.toFixed(2)}`)
        
        // Generate AI performance analysis
        try {
          const analysis = await geminiService.analyzeCampaignPerformance({
            campaignName: campaign.name,
            sent,
            failed,
            audienceSize: total,
          })
          
          // Store analysis (you might want to add an analysis field to the campaign model)
          console.log(`🤖 AI Analysis: ${analysis}`)
          
        } catch (analysisError) {
          console.error('❌ Failed to generate AI analysis:', analysisError)
        }
        
        // Update Redis metrics
        await RedisService.incrementMetric('campaigns:completed:total', 1)
        await RedisService.incrbyfloat('campaigns:costs:total', totalCost)
        
        // Publish completion event
        await RedisService.publishMessage(REDIS_CHANNELS.ANALYTICS_UPDATE, {
          type: 'CAMPAIGN_COMPLETED',
          campaignId,
          stats: { sent, failed, total, successRate, totalCost },
          timestamp: new Date().toISOString(),
        })
      }
      
    } catch (error) {
      console.error(`❌ Failed to check campaign completion for ${campaignId}:`, error)
    }
  }
  
  static async getDeliveryStats(campaignId?: string): Promise<any> {
    try {
      const whereClause = campaignId ? { campaignId } : {}
      
      const [totalLogs, statusStats, vendorStats, costStats] = await Promise.all([
        // Total logs count
        prisma.campaignLog.count({ where: whereClause }),
        
        // Status breakdown
        prisma.campaignLog.groupBy({
          by: ['status'],
          where: whereClause,
          _count: { status: true }
        }),
        
        // Vendor performance
        prisma.campaignLog.groupBy({
          by: ['vendor'],
          where: { ...whereClause, vendor: { not: null } },
          _count: { vendor: true },
          _avg: { cost: true }
        }),
        
        // Cost analysis
        prisma.campaignLog.aggregate({
          where: whereClause,
          _sum: { cost: true },
          _avg: { cost: true },
          _min: { cost: true },
          _max: { cost: true }
        })
      ])
      
      return {
        total: totalLogs,
        status: statusStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.status
          return acc
        }, {} as Record<string, number>),
        vendors: vendorStats.map(stat => ({
          vendor: stat.vendor,
          count: stat._count.vendor,
          avgCost: stat._avg.cost || 0
        })),
        costs: {
          total: costStats._sum.cost || 0,
          average: costStats._avg.cost || 0,
          min: costStats._min.cost || 0,
          max: costStats._max.cost || 0,
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to get delivery stats:', error)
      return null
    }
  }
}