import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { LogisticsService, DeliveryPartner, DeliveryAssignment } from './logistics.service';

@Controller('logistics')
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Get('partners/available')
  async getAvailablePartners(
    @Body() location: { latitude: number; longitude: number },
  ): Promise<DeliveryPartner[]> {
    return this.logisticsService.findAvailablePartners(location.latitude, location.longitude);
  }

  @Post('assign/:orderId')
  async assignDeliveryPartner(
    @Param('orderId') orderId: string,
    @Body() restaurantLocation: { latitude: number; longitude: number },
  ): Promise<DeliveryAssignment> {
    return this.logisticsService.assignDeliveryPartner(orderId, restaurantLocation);
  }

  @Get('delivery/:orderId')
  async getDeliveryStatus(@Param('orderId') orderId: string): Promise<DeliveryAssignment | null> {
    return this.logisticsService.getDeliveryStatus(orderId);
  }

  @Patch('partner/:partnerId/location')
  async updatePartnerLocation(
    @Param('partnerId') partnerId: string,
    @Body() location: { latitude: number; longitude: number },
  ): Promise<void> {
    return this.logisticsService.updatePartnerLocation(partnerId, location.latitude, location.longitude);
  }

  @Get('track/:trackingId')
  async trackOrder(@Param('trackingId') trackingId: string): Promise<any> {
    return this.logisticsService.trackOrder(trackingId);
  }
}
