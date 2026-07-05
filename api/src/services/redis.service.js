const Redis = require('ioredis');
const config = require('../config/index');
const logger = require('../config/logger');

let client = null;
let isConnected = false;

/**
 * Get or create the Redis client.
 * If Redis is unavailable, we fall back gracefully without crashing.
 */
function getRedisClient() {
  if (client) return client;

  try {
    client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.warn('Redis: not available after 3 retries — running without cache.');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 1000);
      },
      enableOfflineQueue: false,
    });

    client.on('connect', () => {
      isConnected = true;
      logger.info('Redis: connected successfully ✅');
    });

    client.on('error', (err) => {
      isConnected = false;
      logger.warn(`Redis: connection error — ${err.message}`);
    });

    client.on('close', () => {
      isConnected = false;
    });

    client.connect().catch(() => {
      isConnected = false;
    });
  } catch (err) {
    logger.warn('Redis: failed to initialize — running without cache.');
    client = null;
  }

  return client;
}

/**
 * Get a cached value.
 * Returns null if Redis is unavailable or the key doesn't exist.
 */
async function cacheGet(key) {
  try {
    const c = getRedisClient();
    if (!c || !isConnected) return null;
    const value = await c.get(key);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    logger.warn(`Redis cacheGet error: ${err.message}`);
    return null;
  }
}

/**
 * Set a cached value with a TTL in seconds.
 */
async function cacheSet(key, value, ttlSeconds = 60) {
  try {
    const c = getRedisClient();
    if (!c || !isConnected) return;
    await c.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn(`Redis cacheSet error: ${err.message}`);
  }
}

/**
 * Delete a cached key (for cache invalidation).
 */
async function cacheDel(key) {
  try {
    const c = getRedisClient();
    if (!c || !isConnected) return;
    await c.del(key);
  } catch (err) {
    logger.warn(`Redis cacheDel error: ${err.message}`);
  }
}

/**
 * Delete all keys matching a pattern (e.g. invalidate all shop caches).
 */
async function cacheDelPattern(pattern) {
  try {
    const c = getRedisClient();
    if (!c || !isConnected) return;
    const keys = await c.keys(pattern);
    if (keys.length > 0) await c.del(...keys);
  } catch (err) {
    logger.warn(`Redis cacheDelPattern error: ${err.message}`);
  }
}

module.exports = { getRedisClient, cacheGet, cacheSet, cacheDel, cacheDelPattern };
