/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  keys(pattern: string): Promise<string[]>;
}

class RedisCacheClient implements CacheClient {
  private client: any = null;
  private connected = false;
  private fallbackCache: Map<string, { value: string; expiry?: number }> = new Map();

  async connect(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.warn('[Cache] REDIS_URL not set, using in-memory fallback');
      return;
    }

    try {
      const redis = await import('redis' as any);
      const { createClient } = redis;
      this.client = createClient({ url: redisUrl });
      this.client.on('error', (err: Error) => {
        console.error('[Cache] Redis error:', err.message);
        this.connected = false;
      });
      await this.client.connect();
      this.connected = true;
      console.log('[Cache] Redis connected');
    } catch (error) {
      console.warn('[Cache] Redis connection failed, using in-memory fallback:', error instanceof Error ? error.message : error);
    }
  }

  private isExpired(entry: { value: string; expiry?: number }): boolean {
    return entry.expiry !== undefined && Date.now() > entry.expiry;
  }

  async get(key: string): Promise<string | null> {
    if (this.connected && this.client) {
      return this.client.get(key);
    }
    const entry = this.fallbackCache.get(key);
    if (!entry || this.isExpired(entry)) {
      this.fallbackCache.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.connected && this.client) {
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
      return;
    }
    this.fallbackCache.set(key, {
      value,
      expiry: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async del(key: string): Promise<void> {
    if (this.connected && this.client) {
      await this.client.del(key);
      return;
    }
    this.fallbackCache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    if (this.connected && this.client) {
      return (await this.client.exists(key)) === 1;
    }
    const entry = this.fallbackCache.get(key);
    if (!entry || this.isExpired(entry)) return false;
    return true;
  }

  async incr(key: string): Promise<number> {
    if (this.connected && this.client) {
      return this.client.incr(key);
    }
    const current = parseInt(this.fallbackCache.get(key)?.value || '0');
    const next = current + 1;
    this.fallbackCache.set(key, { value: String(next) });
    return next;
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (this.connected && this.client) {
      await this.client.expire(key, seconds);
      return;
    }
    const entry = this.fallbackCache.get(key);
    if (entry) {
      entry.expiry = Date.now() + seconds * 1000;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (this.connected && this.client) {
      return this.client.keys(pattern);
    }
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.fallbackCache.keys()).filter(k => regex.test(k));
  }

  async disconnect(): Promise<void> {
    if (this.connected && this.client) {
      await this.client.disconnect();
      this.connected = false;
    }
  }
}

// Singleton
let cacheInstance: RedisCacheClient | null = null;

export async function getCache(): Promise<CacheClient> {
  if (!cacheInstance) {
    cacheInstance = new RedisCacheClient();
    await cacheInstance.connect();
  }
  return cacheInstance;
}

export { RedisCacheClient };
