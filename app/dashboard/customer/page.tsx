'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Icons } from '@/components/icons'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Customer {
  id: string
  name: string | null
  email: string
  totalSpent: number
  visits: number
  totalOrders: number
  lastVisit: string | null
  lastOrderDate: string | null
  createdAt: string
}

interface CustomersResponse {
  success: boolean
  data: Customer[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasMore: boolean
  }
}

export default function CustomersPage() {
  const { data: session } = useSession()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState<CustomersResponse['meta'] | null>(null)

  useEffect(() => {
    if (session) {
      fetchCustomers()
    }
  }, [session, search, sortBy, sortOrder, page])

  const fetchCustomers = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search,
        sortBy,
        sortOrder,
      })

      const response = await fetch(`/api/customer?${params}`)
      const result: CustomersResponse = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch customers')
      }

      if (result.success) {
        setCustomers(result.data)
        setMeta(result.meta)
      } else {
        throw new Error('Failed to fetch customers')
      }
    } catch (error: any) {
      console.error('Failed to fetch customers:', error)
      setError(error.message)
      toast.error('Failed to load customers')
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getCustomerSegment = (totalSpent: number) => {
    if (totalSpent >= 1000) return { label: 'VIP', variant: 'default' as const }
    if (totalSpent >= 100) return { label: 'Regular', variant: 'secondary' as const }
    return { label: 'New', variant: 'outline' as const }
  }

  if (isLoading && customers.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">Manage and view your customer base</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search customers by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Date Joined</SelectItem>
                <SelectItem value="totalSpent">Total Spent</SelectItem>
                <SelectItem value="visits">Visits</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Desc</SelectItem>
                <SelectItem value="asc">Asc</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icons.users className="h-5 w-5" />
            All Customers
            {meta && (
              <Badge variant="secondary" className="ml-2">
                {meta.total} total
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8">
              <Icons.alertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchCustomers}>Try Again</Button>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Icons.users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No customers found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Visits</TableHead>
                    <TableHead>Last Order</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => {
                    const segment = getCustomerSegment(customer.totalSpent)
                    return (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {customer.name 
                                ? customer.name.split(' ').map(n => n[0]).join('') 
                                : customer.email[0].toUpperCase()
                              }
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {customer.name || 'No Name'}
                              </p>
                              <p className="text-sm text-gray-500">{customer.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={segment.variant}>{segment.label}</Badge>
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(customer.totalSpent)}
                        </TableCell>
                        <TableCell>{customer.totalOrders}</TableCell>
                        <TableCell>{customer.visits}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(customer.lastOrderDate)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(customer.createdAt)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-gray-500">
                    Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, meta.total)} of {meta.total} customers
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1 || isLoading}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={!meta.hasMore || isLoading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}