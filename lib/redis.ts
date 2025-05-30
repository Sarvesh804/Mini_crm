import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
});

export default redis;

export const REDIS_CHANNELS = {
    CUSTOMER_INGESTION: 'customer:ingestion',
    ORDER_INGESTION: 'order:ingestion',
    CAMPAIGN_DELIVERY: 'campaign:delivery',
    DELIVERY_RECEIPT: 'delivery:receipt',
    BATCH_UPDATE: 'batch:update'
}

export const REDIS_KEYS = {
    SESSION_PREFIX: 'session:',
    RATE_LIMIT_PREFIX: 'rate_limit:',
    CAMPAIGN_QUEUE: 'campaign:queue',
    DELIVERY_QUEUE: 'delivery:queue'
}