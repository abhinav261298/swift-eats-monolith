import { Controller, Get, Query, Param } from '@nestjs/common';
import { AnalyticsService, DashboardMetrics } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  async getDashboardMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<DashboardMetrics> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    return this.analyticsService.getDashboardMetrics(start, end);
  }

  @Get('user-behavior')
  async getUserBehaviorAnalytics(@Query('userId') userId?: string): Promise<any> {
    return this.analyticsService.getUserBehaviorAnalytics(userId);
  }
}
