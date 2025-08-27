import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Order } from '@orders/entities/order.entity';
import { Payment } from '@payments/entities/payment.entity';
import { Telemetry, TelemetrySchema } from '@telemetry/schemas/telemetry.schema';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Payment]),
    MongooseModule.forFeature([{ name: Telemetry.name, schema: TelemetrySchema }]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
