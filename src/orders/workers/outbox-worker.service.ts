import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxEvent, EventStatus } from '../entities/outbox-event.entity';
import { RedisService } from '@database/redis/redis.service';

@Injectable()
export class OutboxWorkerService implements OnModuleInit {
  constructor(
    @InjectRepository(OutboxEvent)
    private outboxRepository: Repository<OutboxEvent>,
    private redisService: RedisService,
  ) {}

  onModuleInit() {
    // Start processing immediately
    this.processOutboxEvents();
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async processOutboxEvents(): Promise<void> {
    try {
      const pendingEvents = await this.outboxRepository.find({
        where: { status: EventStatus.PENDING },
        order: { createdAt: 'ASC' },
        take: 10, // Process 10 events at a time
      });

      for (const event of pendingEvents) {
        await this.publishEvent(event);
      }
    } catch (error) {
      console.error('Error processing outbox events:', error);
    }
  }

  private async publishEvent(event: OutboxEvent): Promise<void> {
    try {
      const channel = this.getChannelForEventType(event.eventType);
      const message = JSON.stringify({
        eventId: event.id,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        payload: event.payload,
        timestamp: event.createdAt,
      });

      // Publish to Redis Pub/Sub
      await this.redisService.publish(channel, message);

      // Mark as published
      event.status = EventStatus.PUBLISHED;
      event.publishedAt = new Date();
      await this.outboxRepository.save(event);

      console.log(`Published event ${event.id} to channel ${channel}`);
    } catch (error) {
      console.error(`Failed to publish event ${event.id}:`, error);
      
      // Increment retry count and mark as failed if max retries exceeded
      event.retryCount += 1;
      event.error = error.message;
      
      if (event.retryCount >= 3) {
        event.status = EventStatus.FAILED;
      }
      
      await this.outboxRepository.save(event);
    }
  }

  private getChannelForEventType(eventType: string): string {
    const channelMap: Record<string, string> = {
      'order.placed': 'order-events',
      'order.confirmed': 'order-events',
      'order.cancelled': 'order-events',
      'order.status_changed': 'order-events',
    };

    return channelMap[eventType] || 'default-events';
  }

  // Manual retry for failed events
  async retryFailedEvents(): Promise<void> {
    const failedEvents = await this.outboxRepository.find({
      where: { status: EventStatus.FAILED },
      order: { createdAt: 'ASC' },
      take: 5,
    });

    for (const event of failedEvents) {
      if (event.retryCount < 5) { // Allow up to 5 total retries
        event.status = EventStatus.PENDING;
        event.error = null;
        await this.outboxRepository.save(event);
      }
    }
  }
}
