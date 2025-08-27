import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AppConfig } from '@config/configuration';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly subscriber: Redis;
  private readonly publisher: Redis;

  constructor(private configService: ConfigService<AppConfig>) {
    const redisConfig = this.configService.get('database').redis;
    
    const connectionOptions = {
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: true,
    };

    this.client = new Redis(connectionOptions);
    this.subscriber = new Redis(connectionOptions);
    this.publisher = new Redis(connectionOptions);

    // Handle connection errors gracefully
    this.client.on('error', (err) => {
      console.warn('Redis client connection failed:', err.message);
    });
    
    this.subscriber.on('error', (err) => {
      console.warn('Redis subscriber connection failed:', err.message);
    });
    
    this.publisher.on('error', (err) => {
      console.warn('Redis publisher connection failed:', err.message);
    });
  }

  getClient(): Redis {
    return this.client;
  }

  getSubscriber(): Redis {
    return this.subscriber;
  }

  getPublisher(): Redis {
    return this.publisher;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.warn('Redis SET operation failed:', error.message);
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.warn('Redis GET operation failed:', error.message);
      return null;
    }
  }

  async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      console.warn('Redis DEL operation failed:', error.message);
      return 0;
    }
  }

  async publish(channel: string, message: string): Promise<number> {
    try {
      return await this.publisher.publish(channel, message);
    } catch (error) {
      console.warn('Redis PUBLISH operation failed:', error.message);
      return 0;
    }
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    try {
      // Check if Redis is connected before subscribing
      if (this.subscriber.status === 'ready') {
        this.subscriber.subscribe(channel);
        this.subscriber.on('message', (receivedChannel, message) => {
          if (receivedChannel === channel) {
            callback(message);
          }
        });
      } else {
        console.warn('Redis subscriber not ready, skipping subscription to:', channel);
      }
    } catch (error) {
      console.warn('Redis SUBSCRIBE operation failed:', error.message);
    }
  }

  onModuleDestroy() {
    this.client.disconnect();
    this.subscriber.disconnect();
    this.publisher.disconnect();
  }
}
