import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { VendorAPIService } from '@/services/vendor-api'
import { DeliveryReceiptHandler } from '@/services/delivery-receipt-handler'

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
    const action = searchParams.get('action')

    if (action === 'stats') {
      const vendors = await VendorAPIService.getVendorStats()
      const deliveryStats = await DeliveryReceiptHandler.getDeliveryStats()
      
      return NextResponse.json({
        success: true,
        data: {
          vendors,
          deliveryStats,
        },
      })
    }

    const vendors = await VendorAPIService.getVendorStats()
    
    return NextResponse.json({
      success: true,
      data: vendors,
    })
  } catch (error: any) {
    console.error('Vendor API Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch vendor data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, vendor } = body

    if (action === 'test') {
      const isConnected = await VendorAPIService.testVendorConnection(vendor)
      
      return NextResponse.json({
        success: true,
        data: {
          vendor,
          connected: isConnected,
          timestamp: new Date().toISOString(),
        },
      })
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Vendor API Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to process vendor request' },
      { status: 500 }
    )
  }
}