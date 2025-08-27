import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Worker, Queue } from 'bullmq';
import { DriverLocation, DriverLocationDocument } from '../schemas/driver-location.schema';
import { RedisService } from '@database/redis/redis.service';

interface GpsStreamData {
  driverId: string;
  ts: string;
  lat: string;
  lng: string;
  accuracy?: string;
  speed?: string;
  heading?: string;
  ingestedAt: string;
}

@Injectable()
export class GpsProcessorService implements OnModuleInit, OnModuleDestroy {
  private worker: Worker;
  private queue: Queue;
  private isProcessing = false;

  constructor(
    @InjectModel(DriverLocation.name) private driverLocationModel: Model<DriverLocationDocument>,
    private redisService: RedisService,
  ) {}

  async onModuleInit() {
    const redis = this.redisService.getClient();
    
    // Create BullMQ queue with proper Redis configuration
    this.queue = new Queue('gps-processing', {
      connection: {
        host: redis.options.host,
        port: redis.options.port,
        password: redis.options.password,
        maxRetriesPerRequest: null,
        enableOfflineQueue: true,
      },
    });

    // Create worker with proper Redis configuration
    this.worker = new Worker(
      'gps-processing',
      async (job) => {
        await this.processGpsLocation(job.data);
      },
      {
        connection: {
          host: redis.options.host,
          port: redis.options.port,
          password: redis.options.password,
          maxRetriesPerRequest: null,
          enableOfflineQueue: true,
        },
        concurrency: 5,
      }
    );

    // Start consuming Redis stream
    this.startStreamConsumer();
  }

  async onModuleDestroy() {
    this.isProcessing = false;
    if (this.worker) {
      await this.worker.close();
    }
    if (this.queue) {
      await this.queue.close();
    }
  }

  private async startStreamConsumer() {
    this.isProcessing = true;
    const redis = this.redisService.getClient();

    while (this.isProcessing) {
      try {
        // Read from Redis stream
        const streams = await redis.xread('BLOCK', 1000, 'STREAMS', 'gps:ingest', '$');
        
        if (streams) {
          for (const stream of streams) {
            const [streamName, messages] = stream;
            
            for (const message of messages) {
              const [messageId, fields] = message;
              
              // Convert fields array to object
              const data: Partial<GpsStreamData> = {};
              for (let i = 0; i < fields.length; i += 2) {
                data[fields[i] as keyof GpsStreamData] = fields[i + 1];
              }

              // Add to processing queue
              await this.queue.add('process-gps', data, {
                attempts: 3,
                backoff: {
                  type: 'exponential',
                  delay: 2000,
                },
              });

              // Acknowledge message by trimming stream (keep last 10000 messages)
              await redis.xtrim('gps:ingest', 'MAXLEN', '~', 10000);
            }
          }
        }
      } catch (error) {
        console.error('Stream consumer error:', error);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s before retry
      }
    }
  }

  private async processGpsLocation(data: GpsStreamData): Promise<void> {
    try {
      const timestamp = new Date(parseInt(data.ts));
      const lat = parseFloat(data.lat);
      const lng = parseFloat(data.lng);

      // Save to MongoDB
      const driverLocation = new this.driverLocationModel({
        driverId: data.driverId,
        timestamp,
        latitude: lat,
        longitude: lng,
        accuracy: data.accuracy ? parseFloat(data.accuracy) : undefined,
        speed: data.speed ? parseFloat(data.speed) : undefined,
        heading: data.heading ? parseFloat(data.heading) : undefined,
      });

      await driverLocation.save();

      // Update Redis hash with current location
      const redis = this.redisService.getClient();
      await redis.hset(`driver:loc:${data.driverId}`, {
        lat: data.lat,
        lng: data.lng,
        timestamp: data.ts,
        accuracy: data.accuracy || '',
        speed: data.speed || '',
        heading: data.heading || '',
      });

      // Set TTL on driver location hash (1 hour)
      await redis.expire(`driver:loc:${data.driverId}`, 3600);

      // Check if driver is on active order and publish location update
      await this.publishOrderLocationUpdate(data.driverId, { lat, lng, timestamp });

      console.log(`Processed GPS location for driver ${data.driverId}`);
    } catch (error) {
      console.error('Failed to process GPS location:', error);
      throw error; // Let BullMQ handle retry
    }
  }

  private async publishOrderLocationUpdate(
    driverId: string, 
    location: { lat: number; lng: number; timestamp: Date }
  ): Promise<void> {
    try {
      // Check if driver has active order (this would typically come from orders service)
      // For now, we'll check if there's an order ID in the driver's Redis hash
      const redis = this.redisService.getClient();
      const driverData = await redis.hgetall(`driver:active:${driverId}`);
      
      if (driverData.orderId) {
        const locationUpdate = {
          driverId,
          orderId: driverData.orderId,
          location: {
            lat: location.lat,
            lng: location.lng,
            timestamp: location.timestamp.toISOString(),
          },
          type: 'driver_location_update',
        };

        // Publish to order-specific channel
        await this.redisService.publish(
          `order:${driverData.orderId}`,
          JSON.stringify(locationUpdate)
        );

        console.log(`Published location update for order ${driverData.orderId}`);
      }
    } catch (error) {
      console.error('Failed to publish order location update:', error);
      // Don't throw - this is not critical for GPS processing
    }
  }

  // Method to set driver as active on an order
  async setDriverActiveOrder(driverId: string, orderId: string): Promise<void> {
    const redis = this.redisService.getClient();
    await redis.hset(`driver:active:${driverId}`, {
      orderId,
      assignedAt: Date.now().toString(),
    });
    await redis.expire(`driver:active:${driverId}`, 86400); // 24 hours TTL
  }

  // Method to clear driver's active order
  async clearDriverActiveOrder(driverId: string): Promise<void> {
    const redis = this.redisService.getClient();
    await redis.del(`driver:active:${driverId}`);
  }

  // Get processing metrics
  async getProcessingMetrics(): Promise<any> {
    const waiting = await this.queue.getWaiting();
    const active = await this.queue.getActive();
    const completed = await this.queue.getCompleted();
    const failed = await this.queue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }
}
