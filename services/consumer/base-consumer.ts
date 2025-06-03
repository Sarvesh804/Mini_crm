import { RedisService, REDIS_CHANNELS } from '../../lib/redis'

export abstract class BaseConsumer {
  protected isRunning = false
  protected name: string
  protected channels: string[]

  constructor(name: string, channels: string[]) {
    this.name = name
    this.channels = channels
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log(`⚠️ ${this.name} already running`)
      return
    }

    console.log(`🎬 Starting ${this.name}...`)
    this.isRunning = true

    try {
      // Subscribe to channels
      await RedisService.subscribe(...this.channels)
      
      // Set up message handler
      RedisService.on('message', async (channel: string, message: string) => {
        if (this.channels.includes(channel)) {
          try {
            const parsedMessage = JSON.parse(message)
            await this.processMessage(channel, parsedMessage)
          } catch (error) {
            console.error(`❌ ${this.name} message processing error:`, error)
            await this.handleProcessingError(channel, message, error)
          }
        }
      })

      console.log(`✅ ${this.name} started - subscribed to: ${this.channels.join(', ')}`)
    } catch (error) {
      this.isRunning = false
      throw error
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return

    console.log(`🛑 Stopping ${this.name}...`)
    this.isRunning = false

    try {
      await RedisService.unsubscribe(...this.channels)
      console.log(`✅ ${this.name} stopped`)
    } catch (error) {
      console.error(`❌ Error stopping ${this.name}:`, error)
    }
  }

  protected abstract processMessage(channel: string, message: any): Promise<void>

  protected async updateMetrics(key: string, value: number, operation: 'incrby' | 'incrbyfloat' = 'incrby'): Promise<void> {
    try {
      if (operation === 'incrbyfloat') {
        await RedisService.incrbyfloat(`metrics:${key}`, value)
      } else {
        await RedisService.incrementMetric(key, value)
      }
    } catch (error) {
      console.error(`Error updating metric ${key}:`, error)
    }
  }

  protected async publishError(errorData: any): Promise<void> {
    try {
      await RedisService.publishMessage(REDIS_CHANNELS.ERROR_HANDLING, {
        ...errorData,
        timestamp: new Date().toISOString(),
        source: this.name
      })
    } catch (error) {
      console.error(`Error publishing error from ${this.name}:`, error)
    }
  }

  protected async handleProcessingError(channel: string, rawMessage: string, error: any): Promise<void> {
    await this.publishError({
      service: this.name,
      channel,
      rawMessage,
      error: error instanceof Error ? error.message : 'Unknown error',
      parseError: true
    })
  }
}