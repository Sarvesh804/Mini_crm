import { ConsumerManager } from './consumer-manager'
import { VendorAPIService } from './vendor-api'
import { RedisService } from '../lib/redis'

async function main(): Promise<void> {
  console.log('🚀 Starting CRM Consumer Services...')
  console.log('📡 Initializing system components...')
  
  try {
    // Initialize Redis connection
    await RedisService.connect()
    console.log('✅ Redis connected')

    // Test Redis connection
    const pingResult = await RedisService.ping()
    console.log(`📡 Redis ping: ${pingResult}`)

    // Test vendor connections
    console.log('🔍 Testing vendor API connections...')
    const vendors = await VendorAPIService.getVendorStats()
    for (const vendor of vendors) {
      try {
        const isConnected = await VendorAPIService.testVendorConnection(vendor.name)
        console.log(`📊 ${vendor.name}: ${isConnected ? '✅ Connected' : '❌ Failed'}`)
      } catch (error) {
        console.log(`📊 ${vendor.name}: ❌ Connection test failed`)
      }
    }
    
    const consumerManager = new ConsumerManager()
    
    // Graceful shutdown handlers
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...')
      await consumerManager.shutdown()
      await RedisService.disconnect()
      process.exit(0)
    })

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...')
      await consumerManager.shutdown()
      await RedisService.disconnect()
      process.exit(0)
    })

    // Start all consumer services
    await consumerManager.start()

    // Display system metrics every 30 seconds
    setInterval(async () => {
      try {
        const metrics = await consumerManager.getSystemMetrics()
        const connectionStatus = RedisService.getConnectionStatus()
        
        console.log('\n📊 System Metrics:')
        console.log(`   🎯 Campaigns: ${metrics.campaigns.processed} processed, ${metrics.campaigns.active} active`)
        console.log(`   📧 Messages: ${metrics.messages.sent} sent, ${metrics.messages.failed} failed`)
        console.log(`   👤 Customers: ${metrics.customers.processed} processed`)
        console.log(`   💰 Orders: ${metrics.orders.processed} processed`)
        console.log(`   💵 Revenue: $${metrics.revenue.total.toFixed(2)}`)
        console.log(`   💸 Costs: $${metrics.costs.total.toFixed(4)}`)
        console.log(`   ⚡ Processing Times: Campaign ${metrics.performance.avgCampaignTime}ms, Receipt ${metrics.performance.avgReceiptTime}ms`)
        console.log(`   🔗 Redis: Main ${connectionStatus.main ? '✅' : '❌'}, Sub ${connectionStatus.subscriber ? '✅' : '❌'}`)
        console.log('   🟢 Status: All services running\n')
      } catch (error) {
        console.error('Error fetching metrics:', error)
      }
    }, 30000)

    // Display vendor stats every 5 minutes
    setInterval(async () => {
      try {
        console.log('\n📡 Vendor Performance:')
        const vendors = await VendorAPIService.getVendorStats()
        for (const vendor of vendors) {
          console.log(`   ${vendor.name}: ${(vendor.successRate * 100).toFixed(1)}% success, $${vendor.costPerMessage.toFixed(4)}/msg`)
        }
        console.log('')
      } catch (error) {
        console.error('Error fetching vendor stats:', error)
      }
    }, 300000)

    console.log('✅ All consumer services started successfully')
    
  } catch (error) {
    console.error('💥 Failed to start consumer services:', error)
    process.exit(1)
  }
}

// Run the consumer system
main().catch((error) => {
  console.error('💥 Consumer system crashed:', error)
  process.exit(1)
})