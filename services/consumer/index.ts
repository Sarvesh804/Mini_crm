import { DataConsumerService } from './consumer-service'

async function main() {
  console.log('🚀 Starting Redis Consumer Services...')
  
  const dataConsumer = new DataConsumerService()
  
  // Graceful shutdown handlers
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...')
    await dataConsumer.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...')
    await dataConsumer.stop()
    process.exit(0)
  })

  // Start the consumer
  await dataConsumer.start()

  // Display metrics every 30 seconds
  setInterval(async () => {
    const metrics = await dataConsumer.getMetrics()
    if (metrics) {
      console.log('\n📊 Consumer Metrics:')
      console.log(`   👤 Customers Processed: ${metrics.customersProcessed} (Bulk: ${metrics.bulkCustomersProcessed})`)
      console.log(`   💰 Orders Processed: ${metrics.ordersProcessed} (Bulk: ${metrics.bulkOrdersProcessed})`)
      console.log(`   💵 Total Revenue: $${metrics.totalRevenue.toFixed(2)}`)
      console.log(`   ❌ Total Errors: ${metrics.totalErrors}`)
      console.log('   ⚡ Status: Running\n')
    }
  }, 30000)
}

// Run the consumer
main().catch((error) => {
  console.error('💥 Consumer service crashed:', error)
  process.exit(1)
})