import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Telemetry, TelemetryDocument } from './schemas/telemetry.schema';
import { DriverLocation, DriverLocationDocument } from './schemas/driver-location.schema';
import { RedisService } from '@database/redis/redis.service';
import { IngestTelemetryDto, GpsLocationDto } from './dto/ingest-telemetry.dto';

export interface TelemetryEvent {
  eventType: string;
  source: string;
  data: Record<string, any>;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class TelemetryService {
  private ingestCounter = 0;
  private lastMetricTime = Date.now();

  constructor(
    @InjectModel(Telemetry.name) private telemetryModel: Model<TelemetryDocument>,
    @InjectModel(DriverLocation.name) private driverLocationModel: Model<DriverLocationDocument>,
    private redisService: RedisService,
  ) {}

  async logEvent(event: TelemetryEvent): Promise<void> {
    const telemetryRecord = new this.telemetryModel(event);
    await telemetryRecord.save();
  }

  async getEventsByUser(userId: string, limit: number = 100): Promise<Telemetry[]> {
    return this.telemetryModel
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  async getEventsByType(eventType: string, limit: number = 100): Promise<Telemetry[]> {
    return this.telemetryModel
      .find({ eventType })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  async getEventsInTimeRange(startDate: Date, endDate: Date): Promise<Telemetry[]> {
    return this.telemetryModel
      .find({
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .sort({ timestamp: -1 })
      .exec();
  }

  async getEventStats(eventType?: string): Promise<any> {
    const matchStage = eventType ? { $match: { eventType } } : { $match: {} };
    
    return this.telemetryModel.aggregate([
      matchStage,
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            eventType: '$eventType',
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.date': -1 },
      },
    ]);
  }

  // Common telemetry events
  async logUserAction(userId: string, action: string, data: any, source: string = 'api'): Promise<void> {
    await this.logEvent({
      eventType: 'user_action',
      source,
      data: { action, ...data },
      userId,
    });
  }

  async logOrderEvent(orderId: string, event: string, data: any, userId?: string): Promise<void> {
    await this.logEvent({
      eventType: 'order_event',
      source: 'api',
      data: { orderId, event, ...data },
      userId,
    });
  }

  async logPerformanceMetric(metric: string, value: number, source: string = 'api'): Promise<void> {
    await this.logEvent({
      eventType: 'performance_metric',
      source,
      data: { metric, value, timestamp: new Date() },
    });
  }

  // GPS Telemetry Ingestion
  async ingestGpsData(data: IngestTelemetryDto): Promise<{ success: boolean; processed: number }> {
    try {
      const streamEntries = [];
      
      for (const location of data.locations) {
        const streamEntry = {
          driverId: location.driverId,
          ts: location.ts.toString(),
          lat: location.lat.toString(),
          lng: location.lng.toString(),
          accuracy: location.accuracy?.toString() || '',
          speed: location.speed?.toString() || '',
          heading: location.heading?.toString() || '',
          ingestedAt: Date.now().toString(),
        };
        
        streamEntries.push(streamEntry);
      }

      // Push to Redis Stream
      const redis = this.redisService.getClient();
      for (const entry of streamEntries) {
        const fields = Object.entries(entry).flat().map(String);
        await redis.xadd('gps:ingest', '*', ...fields);
      }

      // Update metrics
      this.ingestCounter += data.locations.length;
      await this.updateIngestMetrics();

      return {
        success: true,
        processed: data.locations.length,
      };
    } catch (error) {
      console.error('GPS ingestion failed:', error);
      throw error;
    }
  }

  async getDriverLocation(driverId: string): Promise<{ lat: number; lng: number; timestamp: number } | null> {
    try {
      const redis = this.redisService.getClient();
      const locationData = await redis.hgetall(`driver:loc:${driverId}`);
      
      if (!locationData.lat || !locationData.lng) {
        return null;
      }

      return {
        lat: parseFloat(locationData.lat),
        lng: parseFloat(locationData.lng),
        timestamp: parseInt(locationData.timestamp),
      };
    } catch (error) {
      console.error('Failed to get driver location:', error);
      return null;
    }
  }

  async getDriverLocationHistory(driverId: string, hours: number = 24): Promise<DriverLocation[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return this.driverLocationModel
      .find({
        driverId,
        timestamp: { $gte: since },
      })
      .sort({ timestamp: -1 })
      .limit(1000)
      .exec();
  }

  async getIngestMetrics(): Promise<{ rate: number; total: number; lastUpdate: number }> {
    const now = Date.now();
    const timeDiff = (now - this.lastMetricTime) / 1000; // seconds
    const rate = timeDiff > 0 ? this.ingestCounter / timeDiff : 0;

    return {
      rate: Math.round(rate * 100) / 100, // Round to 2 decimal places
      total: this.ingestCounter,
      lastUpdate: now,
    };
  }

  private async updateIngestMetrics(): Promise<void> {
    const now = Date.now();
    const timeDiff = (now - this.lastMetricTime) / 1000;
    
    // Reset counter every minute for rate calculation
    if (timeDiff >= 60) {
      const rate = this.ingestCounter / timeDiff;
      
      // Log performance metric
      await this.logPerformanceMetric('gps_ingest_rate', rate, 'telemetry');
      
      this.ingestCounter = 0;
      this.lastMetricTime = now;
    }
  }
}
