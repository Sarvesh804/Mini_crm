'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Icons } from '@/components/icons'
import { Separator } from '@/components/ui/separator'

interface Customer {
  id: string
  name: string
  email: string
  totalSpent: number
  visits: number
  lastVisit?: string
}

interface AudiencePreviewProps {
  audienceSize: number
  description: string
  sampleCustomers: Customer[]
  isLoading?: boolean
}

export function AudiencePreview({ 
  audienceSize, 
  description, 
  sampleCustomers, 
  isLoading 
}: AudiencePreviewProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icons.users className="h-5 w-5" />
            Audience Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Icons.spinner className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Calculating audience...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icons.users className="h-5 w-5" />
          Audience Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Audience Size */}
        <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <div className="text-3xl font-bold text-blue-600">{audienceSize.toLocaleString()}</div>
          <div className="text-sm text-gray-600 mt-1">customers match your criteria</div>
          <Badge variant="secondary" className="mt-2">
            {audienceSize > 1000 ? 'Large Audience' : audienceSize > 100 ? 'Medium Audience' : 'Small Audience'}
          </Badge>
        </div>

        {/* Description */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Audience Description</h4>
          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{description}</p>
        </div>

        {/* Sample Customers */}
        {sampleCustomers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Sample Customers</h4>
            <div className="space-y-3">
              {sampleCustomers.map((customer) => (
                <div key={customer.id} className="flex items-center space-x-3 p-3 bg-white border rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs">
                      {customer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{customer.name}</p>
                    <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">${customer.totalSpent.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{customer.visits} visits</p>
                  </div>
                </div>
              ))}
            </div>
            
            {audienceSize > sampleCustomers.length && (
              <div className="text-center mt-3">
                <p className="text-xs text-gray-500">
                  Showing {sampleCustomers.length} of {audienceSize.toLocaleString()} customers
                </p>
              </div>
            )}
          </div>
        )}

        {/* Quick Stats */}
        {sampleCustomers.length > 0 && (
          <>
            <Separator />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  ${(sampleCustomers.reduce((sum, c) => sum + c.totalSpent, 0) / sampleCustomers.length).toFixed(0)}
                </div>
                <div className="text-xs text-gray-500">Avg. Spent</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {Math.round(sampleCustomers.reduce((sum, c) => sum + c.visits, 0) / sampleCustomers.length)}
                </div>
                <div className="text-xs text-gray-500">Avg. Visits</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {((audienceSize / 10000) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">of Total Base</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}