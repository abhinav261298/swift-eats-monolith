import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { TelemetryService, TelemetryEvent } from './telemetry.service';
import { IngestTelemetryDto } from './dto/ingest-telemetry.dto';
import { Telemetry } from './schemas/telemetry.schema';

@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Post('ingest')
  async ingestGpsData(@Body() data: IngestTelemetryDto): Promise<{ success: boolean; processed: number }> {
    return this.telemetryService.ingestGpsData(data);
  }

  @Get('driver/:driverId/location')
  async getDriverLocation(@Param('driverId') driverId: string) {
    return this.telemetryService.getDriverLocation(driverId);
  }

  @Get('driver/:driverId/history')
  async getDriverLocationHistory(
    @Param('driverId') driverId: string,
    @Query('hours') hours?: number,
  ) {
    return this.telemetryService.getDriverLocationHistory(driverId, hours);
  }

  @Get('metrics')
  async getIngestMetrics() {
    return this.telemetryService.getIngestMetrics();
  }

  @Post('event')
  async logEvent(@Body() event: TelemetryEvent): Promise<void> {
    return this.telemetryService.logEvent(event);
  }

  @Get('events/user/:userId')
  async getEventsByUser(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ): Promise<Telemetry[]> {
    return this.telemetryService.getEventsByUser(userId, limit);
  }

  @Get('events/type/:eventType')
  async getEventsByType(
    @Param('eventType') eventType: string,
    @Query('limit') limit?: number,
  ): Promise<Telemetry[]> {
    return this.telemetryService.getEventsByType(eventType, limit);
  }

  @Get('events/range')
  async getEventsInTimeRange(
    @Query('start') start: string,
    @Query('end') end: string,
  ): Promise<Telemetry[]> {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return this.telemetryService.getEventsInTimeRange(startDate, endDate);
  }

  @Get('stats')
  async getEventStats(@Query('eventType') eventType?: string): Promise<any> {
    return this.telemetryService.getEventStats(eventType);
  }
}
