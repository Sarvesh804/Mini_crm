import { EnhancedConsumerService } from './enhanced-consumer'
import { VendorAPIService } from './vendor-api'

async function main() {
  console.log('🚀 Starting Enhanced Redis Consumer Services...')
  console.log('📡 Initializing vendor APIs...')
  
  // Test vendor connections
  const vendors = await VendorAPIService.getVendorStats()
  for (const vendor of vendors) {
    try {
      const isConnected = await VendorAPIService.testVendorConnection(vendor.name)
      console.log(`📊 ${vendor.name}: ${isConnected ? '✅ Connected' : '❌ Failed'}`)
    } catch (error) {
      console.log(`📊 ${vendor.name}: ❌ Connection test failed`)
    }
  }
  
  const enhancedConsumer = new EnhancedConsumerService()
  
  // Graceful shutdown handlers
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...')
    await enhancedConsumer.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...')
    await enhancedConsumer.stop()
    process.exit(0)
  })

  // Start the enhanced consumer
  await enhancedConsumer.start()

  // Display enhanced metrics every 30 seconds
  setInterval(async () => {
    const metrics = await enhancedConsumer.getEnhancedMetrics()
    const analytics = await enhancedConsumer.getRealtimeAnalytics()
    
    if (metrics && analytics) {
      console.log('\n📊 Enhanced Consumer Metrics:')
      console.log(`   👤 Customers: ${metrics.customersProcessed} processed (Bulk: ${metrics.bulkCustomersProcessed})`)
      console.log(`   💰 Orders: ${metrics.ordersProcessed} processed (Bulk: ${metrics.bulkOrdersProcessed})`)
      console.log(`   🎯 Campaigns: ${metrics.campaignsProcessed} processed (Errors: ${metrics.campaignErrors})`)
      console.log(`   📧 Receipts: ${metrics.receiptsProcessed} processed (Errors: ${metrics.receiptErrors})`)
      console.log(`   💵 Total Revenue: $${metrics.totalRevenue.toFixed(2)}`)
      console.log(`   📤 Delivered: ${metrics.totalDelivered} messages`)
      console.log(`   ❌ Failed: ${metrics.totalFailed} messages`)
      console.log(`   💸 Total Costs: $${metrics.totalCosts.toFixed(4)}`)
      console.log(`   ⚡ Avg Processing: Campaigns ${metrics.avgCampaignProcessingTime}ms, Receipts ${metrics.avgReceiptProcessingTime}ms`)
      console.log(`   📈 Today: ${analytics.dailyDeliveries.sent} sent, ${analytics.dailyDeliveries.failed} failed`)
      console.log('   🟢 Status: Running\n')
    }
  }, 30000)

  // Display vendor stats every 5 minutes
  setInterval(async () => {
    console.log('\n📡 Vendor Status Check:')
    const vendors = await VendorAPIService.getVendorStats()
    for (const vendor of vendors) {
      console.log(`   ${vendor.name}: Success Rate ${(vendor.successRate * 100).toFixed(1)}%, Cost $${vendor.costPerMessage.toFixed(4)}/msg`)
    }
    console.log('')
  }, 300000)
}

// Run the enhanced consumer
main().catch((error) => {
  console.error('💥 Enhanced consumer service crashed:', error)
  process.exit(1)
})