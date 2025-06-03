import Redis from "ioredis";
import { EventEmitter } from 'events';

// Create single Redis client for all operations
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
  keepAlive: 30000,
  enableOfflineQueue: false,
  connectTimeout: 60000,
  commandTimeout: 5000,
});

// Connection event handlers
redis.on("connect", () => {
  console.log("✅ Redis client connected successfully");
});

redis.on("error", (err) => {
  console.error("❌ Redis client connection error:", err);
});

redis.on("ready", () => {
  console.log("✅ Redis client is ready to accept commands");
});

redis.on("close", () => {
  console.log("⚠️ Redis client connection closed");
});

export default redis;

export const REDIS_CHANNELS = {
  CUSTOMER_INGESTION: "customer:ingestion",
  CUSTOMER_BULK_INGESTION: "customer:bulk:ingestion",
  ORDER_INGESTION: "order:ingestion",
  ORDER_BULK_INGESTION: "order:bulk:ingestion",
  CAMPAIGN_DELIVERY: "campaign:delivery",
  DELIVERY_RECEIPT: "delivery:receipt",
  BATCH_UPDATE: "batch:update",
  ERROR_HANDLING: "error:handling",
  ANALYTICS_UPDATE: "analytics:update",
} as const;

export const REDIS_KEYS = {
  SESSION_PREFIX: "session:",
  RATE_LIMIT_PREFIX: "rate_limit:",
  CAMPAIGN_QUEUE: "campaign:queue",
  DELIVERY_QUEUE: "delivery:queue",
  CUSTOMER_CACHE: "customer:cache:",
  ORDER_CACHE: "order:cache:",
  ANALYTICS_CACHE: "analytics:cache:",
  API_METRICS: "api:metrics:",
  METRICS_PREFIX: "metrics:",
} as const;

// Event emitter for message handling
class RedisEventEmitter extends EventEmitter {}
const redisEvents = new RedisEventEmitter();

// Helper functions for Redis operations
export class RedisService {
  private static isConnected = false;
  private static subscribedChannels = new Set<string>();

  // Connection management
  static async connect(): Promise<void> {
    try {
      console.log(process.env.REDIS_URL ? "Connecting to Redis at " + process.env.REDIS_URL : "Connecting to local Redis instance");
      
      if (!this.isConnected) {
        await redis.connect();
        this.isConnected = true;
        console.log("✅ Redis client connected");
      }
    } catch (error) {
      console.error("❌ Redis connection failed:", error);
      throw error;
    }
  }

  static async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        // Unsubscribe from all channels first
        if (this.subscribedChannels.size > 0) {
          await redis.unsubscribe(...Array.from(this.subscribedChannels));
          this.subscribedChannels.clear();
        }
        
        await redis.disconnect();
        this.isConnected = false;
        console.log("✅ Redis client disconnected");
      }
    } catch (error) {
      console.error("❌ Redis disconnection error:", error);
      throw error;
    }
  }

  // Pub/Sub operations using single client
  static async publishMessage(channel: string, data: Record<string, unknown>): Promise<number> {
    const message = JSON.stringify({
      ...data,
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID(),
    });
    
    return await redis.publish(channel, message);
  }

  static async subscribe(...channels: string[]): Promise<void> {
    for (const channel of channels) {
      if (!this.subscribedChannels.has(channel)) {
        await redis.subscribe(channel);
        this.subscribedChannels.add(channel);
        console.log(`📡 Subscribed to channel: ${channel}`);
      }
    }

    // Set up message handler if not already set
    if (!redis.listenerCount('message')) {
      redis.on('message', (channel: string, message: string) => {
        try {
          redisEvents.emit('message', channel, message);
        } catch (error) {
          console.error(`Error handling message from ${channel}:`, error);
        }
      });
    }
  }

  static async unsubscribe(...channels: string[]): Promise<void> {
    for (const channel of channels) {
      if (this.subscribedChannels.has(channel)) {
        await redis.unsubscribe(channel);
        this.subscribedChannels.delete(channel);
        console.log(`📡 Unsubscribed from channel: ${channel}`);
      }
    }
  }

  static on(event: 'message', listener: (channel: string, message: string) => void): void {
    redisEvents.on(event, listener);
  }

  static off(event: 'message', listener: (channel: string, message: string) => void): void {
    redisEvents.off(event, listener);
  }

  // Cache operations
  static async cacheSet(key: string, data: unknown, ttlSeconds: number = 3600): Promise<void> {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  }

  static async cacheGet<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  // Basic Redis operations
  static async set(key: string, value: string): Promise<void> {
    await redis.set(key, value);
  }

  static async get(key: string): Promise<string | null> {
    return await redis.get(key);
  }

  static async setex(key: string, seconds: number, value: string): Promise<void> {
    await redis.setex(key, seconds, value);
  }

  static async expire(key: string, seconds: number): Promise<number> {
    return await redis.expire(key, seconds);
  }

  static async del(key: string): Promise<number> {
    return await redis.del(key);
  }

  static async exists(key: string): Promise<number> {
    return await redis.exists(key);
  }

  static async keys(pattern: string): Promise<string[]> {
    return await redis.keys(pattern);
  }

  // List operations
  static async lpush(key: string, ...values: string[]): Promise<number> {
    return await redis.lpush(key, ...values);
  }

  static async rpush(key: string, ...values: string[]): Promise<number> {
    return await redis.rpush(key, ...values);
  }

  static async lpop(key: string): Promise<string | null> {
    return await redis.lpop(key);
  }

  static async rpop(key: string): Promise<string | null> {
    return await redis.rpop(key);
  }

  static async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return await redis.lrange(key, start, stop);
  }

  static async ltrim(key: string, start: number, stop: number): Promise<string> {
    return await redis.ltrim(key, start, stop);
  }

  // Metrics operations
  static async incrementMetric(key: string, increment: number = 1): Promise<number> {
    const fullKey = key.startsWith('metrics:') ? key : `${REDIS_KEYS.METRICS_PREFIX}${key}`;
    return await redis.incrby(fullKey, increment);
  }

  static async incrbyfloat(key: string, increment: number): Promise<string> {
    const fullKey = key.startsWith('metrics:') ? key : `${REDIS_KEYS.METRICS_PREFIX}${key}`;
    return await redis.incrbyfloat(fullKey, increment);
  }

  static async decrementMetric(key: string, decrement: number = 1): Promise<number> {
    const fullKey = key.startsWith('metrics:') ? key : `${REDIS_KEYS.METRICS_PREFIX}${key}`;
    return await redis.decrby(fullKey, decrement);
  }

  // Queue operations
  static async addToQueue(queue: string, data: unknown, priority: number = 0): Promise<void> {
    await redis.zadd(queue, priority, JSON.stringify(data));
  }

  static async getFromQueue<T = unknown>(queue: string, count: number = 10): Promise<T[]> {
    const items = await redis.zrange(queue, 0, count - 1);
    if (items.length > 0) {
      await redis.zrem(queue, ...items);
    }
    return items.map(item => JSON.parse(item));
  }

  static async getQueueLength(queue: string): Promise<number> {
    return await redis.zcard(queue);
  }

  // Enhanced metrics operations
  static async getMetrics(): Promise<{
    campaignsCreated?: number
    messagesSent?: number
    messagesFailed?: number
    totalRevenue?: number
    activeCustomers?: number
    campaignsProcessed?: number
    ordersProcessed?: number
    customersProcessed?: number
    totalCosts?: number
    avgCampaignProcessingTime?: number
    avgReceiptProcessingTime?: number
    activeCampaigns?: number
    completedCampaigns?: number
    messagesPending?: number
    totalDelivered?: number
    totalFailed?: number
    [key: string]: any
  }> {
    try {
      const keys = await redis.keys(`${REDIS_KEYS.METRICS_PREFIX}*`);
      const metrics: Record<string, any> = {};

      if (keys.length > 0) {
        const values = await redis.mget(...keys);
        
        keys.forEach((key, index) => {
          const metricName = key.replace(REDIS_KEYS.METRICS_PREFIX, '');
          const value = values[index];
          metrics[metricName] = value ? parseFloat(value) || 0 : 0;
        });
      }

      // Calculate derived metrics
      const campaignProcessingTimes = metrics['campaigns:processing:time'] || 0;
      const campaignsProcessed = metrics['campaigns:processed'] || 0;
      const receiptProcessingTimes = metrics['receipts:processing:time'] || 0;
      const receiptsProcessed = metrics['receipts:processed'] || 0;

      return {
        // Basic metrics
        campaignsCreated: metrics['campaigns:created'] || 0,
        messagesSent: metrics['messages:sent'] || 0,
        messagesFailed: metrics['messages:failed'] || 0,
        totalRevenue: metrics['revenue:total'] || 0,
        activeCustomers: metrics['customers:active'] || 0,
        
        // Processing metrics
        campaignsProcessed: campaignsProcessed,
        ordersProcessed: metrics['orders:processed'] || 0,
        customersProcessed: metrics['customers:processed'] || 0,
        receiptsProcessed: receiptsProcessed,
        
        // Financial metrics
        totalCosts: metrics['delivery:costs:total'] || 0,
        
        // Performance metrics
        avgCampaignProcessingTime: campaignsProcessed > 0 ? Math.round(campaignProcessingTimes / campaignsProcessed) : 0,
        avgReceiptProcessingTime: receiptsProcessed > 0 ? Math.round(receiptProcessingTimes / receiptsProcessed) : 0,
        
        // Campaign status
        activeCampaigns: metrics['campaigns:active'] || 0,
        completedCampaigns: metrics['campaigns:completed'] || 0,
        
        // Message status
        messagesPending: metrics['messages:pending'] || 0,
        totalDelivered: metrics['delivery:receipts:sent'] || 0,
        totalFailed: metrics['delivery:receipts:failed'] || 0,
        
        // Include all raw metrics
        ...metrics
      };
    } catch (error) {
      console.error('Error getting metrics:', error);
      return {
        campaignsCreated: 0,
        messagesSent: 0,
        messagesFailed: 0,
        totalRevenue: 0,
        activeCustomers: 0,
        campaignsProcessed: 0,
        ordersProcessed: 0,
        customersProcessed: 0,
        totalCosts: 0,
        avgCampaignProcessingTime: 0,
        avgReceiptProcessingTime: 0,
        activeCampaigns: 0,
        completedCampaigns: 0,
        messagesPending: 0,
        totalDelivered: 0,
        totalFailed: 0
      };
    }
  }

  static async resetMetrics(): Promise<void> {
    try {
      const keys = await redis.keys(`${REDIS_KEYS.METRICS_PREFIX}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`🧹 Reset ${keys.length} metrics`);
      }
    } catch (error) {
      console.error('Error resetting metrics:', error);
    }
  }

  static async getMetric(key: string): Promise<number> {
    try {
      const fullKey = key.startsWith('metrics:') ? key : `${REDIS_KEYS.METRICS_PREFIX}${key}`;
      const value = await redis.get(fullKey);
      return value ? parseFloat(value) || 0 : 0;
    } catch (error) {
      console.error(`Error getting metric ${key}:`, error);
      return 0;
    }
  }

  static async setMetric(key: string, value: number): Promise<void> {
    try {
      const fullKey = key.startsWith('metrics:') ? key : `${REDIS_KEYS.METRICS_PREFIX}${key}`;
      await redis.set(fullKey, value.toString());
    } catch (error) {
      console.error(`Error setting metric ${key}:`, error);
    }
  }

  // Health check
  static async ping(): Promise<string> {
    return await redis.ping();
  }

  static getConnectionStatus(): { main: boolean; subscriber: boolean } {
    return {
      main: redis.status === 'ready',
      subscriber: redis.status === 'ready' // Same client for both
    };
  }

  // Get Redis client for advanced operations
  static getClient(): Redis {
    return redis;
  }

  // For compatibility (returns same client)
  static getSubscriber(): Redis {
    return redis;
  }

  // Batch operations for better performance
  static async mget(...keys: string[]): Promise<(string | null)[]> {
    return await redis.mget(...keys);
  }

  static async mset(keyValuePairs: Record<string, string>): Promise<string> {
    const pairs: string[] = [];
    for (const [key, value] of Object.entries(keyValuePairs)) {
      pairs.push(key, value);
    }
    return await redis.mset(...pairs);
  }

  // Hash operations
  static async hset(key: string, field: string, value: string): Promise<number> {
    return await redis.hset(key, field, value);
  }

  static async hget(key: string, field: string): Promise<string | null> {
    return await redis.hget(key, field);
  }

  static async hgetall(key: string): Promise<Record<string, string>> {
    return await redis.hgetall(key);
  }

  static async hdel(key: string, ...fields: string[]): Promise<number> {
    return await redis.hdel(key, ...fields);
  }

  // Set operations
  static async sadd(key: string, ...members: string[]): Promise<number> {
    return await redis.sadd(key, ...members);
  }

  static async smembers(key: string): Promise<string[]> {
    return await redis.smembers(key);
  }

  static async srem(key: string, ...members: string[]): Promise<number> {
    return await redis.srem(key, ...members);
  }
}