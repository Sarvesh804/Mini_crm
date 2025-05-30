// filepath: app/page.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center">
            <Icons.logo className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Mini CRM Platform
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Intelligent customer relationship management with AI-powered insights, 
            automated campaigns, and beautiful analytics.
          </p>
          
          <div className="flex justify-center space-x-4">
            <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Link href="/auth/signin">
                Get Started
                <Icons.chevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            
            <Button variant="outline" size="lg" asChild>
              <Link href="/docs">
                View Docs
              </Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Icons.users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold">Customer Segmentation</h3>
              <p className="text-gray-600">Create dynamic audience segments with flexible rule builders</p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Icons.zap className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold">AI-Powered Campaigns</h3>
              <p className="text-gray-600">Generate personalized messages with AI insights</p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Icons.activity className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Real-time Analytics</h3>
              <p className="text-gray-600">Track campaign performance with beautiful dashboards</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}