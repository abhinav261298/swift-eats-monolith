import { Injectable } from '@nestjs/common';
import { RedisService } from '@database/redis/redis.service';

export interface DeliveryPartner {
  id: string;
  name: string;
  phone: string;
  currentLocation: {
    latitude: number;
    longitude: number;
  };
  isAvailable: boolean;
  rating: number;
}

export interface DeliveryAssignment {
  orderId: string;
  partnerId: string;
  estimatedDeliveryTime: Date;
  trackingId: string;
}

@Injectable()
export class LogisticsService {
  constructor(private redisService: RedisService) {}

  async findAvailablePartners(latitude: number, longitude: number): Promise<DeliveryPartner[]> {
    // Mock implementation - in production, this would query a real database
    const mockPartners: DeliveryPartner[] = [
      {
        id: 'partner-1',
        name: 'John Doe',
        phone: '+1234567890',
        currentLocation: { latitude: latitude + 0.001, longitude: longitude + 0.001 },
        isAvailable: true,
        rating: 4.8,
      },
      {
        id: 'partner-2',
        name: 'Jane Smith',
        phone: '+1234567891',
        currentLocation: { latitude: latitude + 0.002, longitude: longitude - 0.001 },
        isAvailable: true,
        rating: 4.9,
      },
    ];

    return mockPartners.filter(partner => partner.isAvailable);
  }

  async assignDeliveryPartner(orderId: string, restaurantLocation: { latitude: number; longitude: number }): Promise<DeliveryAssignment> {
    const availablePartners = await this.findAvailablePartners(
      restaurantLocation.latitude,
      restaurantLocation.longitude,
    );

    if (availablePartners.length === 0) {
      throw new Error('No delivery partners available');
    }

    // Select the highest-rated available partner
    const selectedPartner = availablePartners.sort((a, b) => b.rating - a.rating)[0];
    
    const trackingId = `TRK${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const estimatedDeliveryTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const assignment: DeliveryAssignment = {
      orderId,
      partnerId: selectedPartner.id,
      estimatedDeliveryTime,
      trackingId,
    };

    // Store assignment in Redis
    await this.redisService.set(
      `delivery:${orderId}`,
      JSON.stringify(assignment),
      3600, // 1 hour TTL
    );

    return assignment;
  }

  async getDeliveryStatus(orderId: string): Promise<DeliveryAssignment | null> {
    const assignmentData = await this.redisService.get(`delivery:${orderId}`);
    
    if (!assignmentData) {
      return null;
    }

    return JSON.parse(assignmentData);
  }

  async updatePartnerLocation(partnerId: string, latitude: number, longitude: number): Promise<void> {
    const locationData = {
      partnerId,
      latitude,
      longitude,
      timestamp: new Date(),
    };

    await this.redisService.set(
      `partner:location:${partnerId}`,
      JSON.stringify(locationData),
      300, // 5 minutes TTL
    );

    // Publish location update for real-time tracking
    await this.redisService.publish(
      'partner-location-updates',
      JSON.stringify(locationData),
    );
  }

  async trackOrder(trackingId: string): Promise<any> {
    // Mock tracking data - in production, this would integrate with GPS tracking
    return {
      trackingId,
      status: 'out_for_delivery',
      estimatedArrival: new Date(Date.now() + 15 * 60 * 1000),
      currentLocation: {
        latitude: 40.7128,
        longitude: -74.0060,
      },
      updates: [
        { timestamp: new Date(Date.now() - 10 * 60 * 1000), message: 'Order picked up from restaurant' },
        { timestamp: new Date(Date.now() - 5 * 60 * 1000), message: 'On the way to delivery address' },
      ],
    };
  }
}
