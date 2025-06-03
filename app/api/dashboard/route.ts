import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface DashboardStats {
  totalCustomers: number
  totalOrders: number
  totalRevenue: number
  activeCampaigns: number
  recentCampaigns: Array<{
    id: string
    name: string
    status: string
    sent: number
    failed: number
    createdAt: Date
  }>
  recentCustomers: Array<{
    id: string
    name: string | null
    email: string
    totalSpent: number | null
    createdAt: Date
  }>
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Execute all queries in parallel for better performance
    const [
      totalCustomers,
      totalOrders,
      revenueResult,
      activeCampaigns,
      recentCampaigns,
      recentCustomers
    ] = await Promise.all([
      // Total customers count
      prisma.customer.count(),

      // Total orders count
      prisma.order.count(),

      // Total revenue - sum of all order amounts
      prisma.order.aggregate({
        _sum: {
          amount: true
        }
      }),

      // Active campaigns count
      prisma.campaign.count({
        where: {
          status: 'ACTIVE',
          createdBy: session.user.id
        }
      }),

      // Recent campaigns with stats
      prisma.campaign.findMany({
        where: {
          createdBy: session.user.id
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5,
        include: {
          campaignLogs: {
            select: {
              status: true
            }
          }
        }
      }),

      // Recent customers
      prisma.customer.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          totalSpent: true,
          createdAt: true
        }
      })
    ])

    // Process campaigns to calculate sent/failed stats
    const processedCampaigns = recentCampaigns.map(campaign => {
      const logs = campaign.campaignLogs || []
      const sent = logs.filter(log => log.status === 'SENT').length
      const failed = logs.filter(log => log.status === 'FAILED').length

      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        sent,
        failed,
        createdAt: campaign.createdAt
      }
    })

    const stats: DashboardStats = {
      totalCustomers,
      totalOrders,
      totalRevenue: revenueResult._sum.amount || 0,
      activeCampaigns,
      recentCampaigns: processedCampaigns,
      recentCustomers: recentCustomers.map(customer => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        totalSpent: customer.totalSpent || 0,
        createdAt: customer.createdAt
      }))
    }

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error: any) {
    console.error('Dashboard API Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch dashboard data',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}