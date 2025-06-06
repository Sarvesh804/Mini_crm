'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Campaign {
  id: string
  name: string
  status: string
  sent: number
  failed: number
  createdAt: string
}

interface Customer {
  id: string
  name: string | null
  email: string
  totalSpent: number
  createdAt: string
}

interface DashboardStats {
  totalCustomers: number
  totalOrders: number
  totalRevenue: number
  activeCampaigns: number
  recentCampaigns: Campaign[]
  recentCustomers: Customer[]
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDashboardStats()
    }
  }, [status])

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/dashboard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch dashboard data')
      }

      if (result.success) {
        setStats(result.data)
      } else {
        throw new Error(result.message || 'Failed to fetch dashboard data')
      }
    } catch (error: unknown) {
      console.error('Failed to fetch dashboard stats:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('An unknown error occurred')
      }
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <Icons.alertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchDashboardStats}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {session?.user?.name?.split(' ')[0] || 'User'}! 👋
        </h1>
        <p className="text-gray-600 mt-1">Here&apos;s what&apos;s happening with your CRM today</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Customers</p>
                <p className="text-2xl font-bold">{stats?.totalCustomers.toLocaleString()}</p>
              </div>
              <Icons.users className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Orders</p>
                <p className="text-2xl font-bold">{stats?.totalOrders.toLocaleString()}</p>
              </div>
              <Icons.dollar className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</p>
              </div>
              <Icons.trending className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Active Campaigns</p>
                <p className="text-2xl font-bold">{stats?.activeCampaigns}</p>
              </div>
              <Icons.target className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Campaigns */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Icons.target className="h-5 w-5" />
              Recent Campaigns
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/dashboard/campaigns')}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentCampaigns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Icons.target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No campaigns yet</p>
                  <Button 
                    className="mt-2" 
                    size="sm"
                    onClick={() => router.push('/dashboard/campaigns/create')}
                  >
                    Create Your First Campaign
                  </Button>
                </div>
              ) : (
                stats?.recentCampaigns.map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                      <div className="flex items-center gap-4 mt-1">
                        <Badge variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {campaign.status}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          Sent: {campaign.sent} | Failed: {campaign.failed}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(campaign.createdAt)}
                        </span>
                      </div>
                    </div>
                    <Icons.chevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Customers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Icons.users className="h-5 w-5" />
              Recent Customers
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/dashboard/customers')}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentCustomers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Icons.users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No customers yet</p>
                </div>
              ) : (
                stats?.recentCustomers.map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {customer.name ? customer.name.split(' ').map((n: string) => n[0]).join('') : customer.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{customer.name || 'No Name'}</p>
                        <p className="text-sm text-gray-500">{customer.email}</p>
                        <p className="text-xs text-gray-400">{formatDate(customer.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">{formatCurrency(customer.totalSpent)}</p>
                      <p className="text-xs text-gray-500">Total spent</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icons.zap className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => router.push('/dashboard/campaigns/create')}
              className="h-16 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <div className="text-center">
                <Icons.add className="h-6 w-6 mx-auto mb-1" />
                <div className="text-sm">Create Campaign</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/customers')}
              className="h-16"
            >
              <div className="text-center">
                <Icons.users className="h-6 w-6 mx-auto mb-1" />
                <div className="text-sm">Manage Customers</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/analytics')}
              className="h-16"
            >
              <div className="text-center">
                <Icons.barChart className="h-6 w-6 mx-auto mb-1" />
                <div className="text-sm">View Analytics</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}