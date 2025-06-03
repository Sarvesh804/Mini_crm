'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Icons } from '@/components/icons'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface AnalyticsData {
  period: number
  revenue: {
    current: number
    previous: number
    growth: number
    chartData: Array<{ date: string; amount: number }>
  }
  customers: {
    chartData: Array<{ date: string; count: number }>
    segments: {
      vip: number
      regular: number
      new: number
    }
    top: Array<{
      id: string
      name: string | null
      email: string
      totalSpent: number
      visits: number
    }>
  }
  campaigns: {
    performance: Array<{
      id: string
      name: string
      sent: number
      failed: number
      pending: number
      total: number
      successRate: string
      audienceSize: number
    }>
    totalCampaigns: number
    avgSuccessRate: string
  }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function AnalyticsPage() {
  const { data: session } = useSession()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('30')

  useEffect(() => {
    if (session) {
      fetchAnalytics()
    }
  }, [session, period])

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/analytics/realtime?period=${period}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch analytics')
      }

      if (result.success) {
        setAnalytics(result.data)
      } else {
        throw new Error('Failed to fetch analytics')
      }
    } catch (error: unknown) {
      console.error('Failed to fetch analytics:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('An unknown error occurred')
      }
      toast.error('Failed to load analytics')
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

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-80 bg-gray-200 rounded"></div>
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
            <h2 className="text-xl font-semibold mb-2">Error Loading Analytics</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchAnalytics}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const customerSegmentData = analytics ? [
    { name: 'VIP (≥$1000)', value: analytics.customers.segments.vip, color: '#0088FE' },
    { name: 'Regular ($100-999)', value: analytics.customers.segments.regular, color: '#00C49F' },
    { name: 'New (<$100)', value: analytics.customers.segments.new, color: '#FFBB28' },
  ] : []

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Track your business performance and insights</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {analytics && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(analytics.revenue.current)}</p>
                    <p className={`text-sm ${analytics.revenue.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercentage(analytics.revenue.growth)} from last period
                    </p>
                  </div>
                  <Icons.dollar className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                    <p className="text-2xl font-bold">{analytics.campaigns.totalCampaigns}</p>
                    <p className="text-sm text-gray-500">
                      {analytics.campaigns.avgSuccessRate}% avg success rate
                    </p>
                  </div>
                  <Icons.target className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Customer Segments</p>
                    <p className="text-2xl font-bold">
                      {analytics.customers.segments.vip + analytics.customers.segments.regular + analytics.customers.segments.new}
                    </p>
                    <p className="text-sm text-gray-500">{analytics.customers.segments.vip} VIP customers</p>
                  </div>
                  <Icons.users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={analytics.revenue.chartData as Array<{ date: string; amount: number }>}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number | string) => formatCurrency(Number(value))}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#8884d8"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Customer Segments */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Segments</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={customerSegmentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {customerSegmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Campaign Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.campaigns.performance.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No campaigns yet</p>
                  ) : (
                    analytics.campaigns.performance.slice(0, 5).map((campaign) => (
                      <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{campaign.name}</h4>
                          <p className="text-sm text-gray-500">
                            Audience: {campaign.audienceSize} | Success: {campaign.successRate}%
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary">{campaign.sent} sent</Badge>
                          {campaign.failed > 0 && (
                            <Badge variant="destructive" className="ml-1">{campaign.failed} failed</Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Customers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.customers.top.slice(0, 5).map((customer, index) => (
                    <div key={customer.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{customer.name || 'No Name'}</p>
                          <p className="text-sm text-gray-500">{customer.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">{formatCurrency(customer.totalSpent)}</p>
                        <p className="text-xs text-gray-500">{customer.visits} visits</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}