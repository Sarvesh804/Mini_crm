import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { EnhancedConsumerService } from '@/lib/services/enhanced-consumer'
import { DeliveryReceiptHandler } from '@/lib/services/delivery-receipt-handler'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'
    const campaignId = searchParams.get('campaignId')

    // Create temporary consumer instance to access analytics methods
    const consumer = new EnhancedConsumerService()

    switch (type) {
      case 'overview':
        const overview = await consumer.getRealtimeAnalytics()
        return NextResponse.json({
          success: true,
          data: overview,
        })

      case 'metrics':
        const metrics = await consumer.getEnhancedMetrics()
        return NextResponse.json({
          success: true,
          data: metrics,
        })

      case 'delivery':
        const deliveryStats = await DeliveryReceiptHandler.getDeliveryStats(campaignId || undefined)
        return NextResponse.json({
          success: true,
          data: deliveryStats,
        })

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid analytics type' },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error('Analytics API Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}