import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
  keepAlive: 30000,
});

// Connection event handlers
redis.on("connect", () => {
  console.log("Redis connected successfully");
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

redis.on("ready", () => {
  console.log("Redis is ready to accept commands");
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
} as const;




// Helper functions for Redis operations
export class RedisService {
    static async publishMessage(channel: string, data: Record<string, unknown>): Promise<number> {
      const message = JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
        id: crypto.randomUUID(),
      })
      
      return await redis.publish(channel, message)
    }
  
    static async cacheSet(key: string, data: unknown, ttlSeconds: number = 3600): Promise<void> {
      await redis.setex(key, ttlSeconds, JSON.stringify(data))
    }
  
    static async cacheGet<T>(key: string): Promise<T | null> {
      const data = await redis.get(key)
      return data ? JSON.parse(data) : null
    }
  
    static async incrementMetric(key: string, increment: number = 1): Promise<number> {
      return await redis.incrby(key, increment)
    }
  
    static async addToQueue(queue: string, data: unknown, priority: number = 0): Promise<void> {
      await redis.zadd(queue, priority, JSON.stringify(data))
    }
  
    static async getFromQueue<T = unknown>(queue: string, count: number = 10): Promise<T[]> {
      const items = await redis.zrange(queue, 0, count - 1)
      if (items.length > 0) {
        await redis.zrem(queue, ...items)
      }
      return items.map(item => JSON.parse(item))
    }
  }