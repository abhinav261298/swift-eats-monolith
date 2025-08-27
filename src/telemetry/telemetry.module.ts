import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TelemetryService } from './telemetry.service';
import { TelemetryController } from './telemetry.controller';
import { GpsProcessorService } from './workers/gps-processor.service';
import { Telemetry, TelemetrySchema } from './schemas/telemetry.schema';
import { DriverLocation, DriverLocationSchema } from './schemas/driver-location.schema';
import { RedisModule } from '@database/redis/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Telemetry.name, schema: TelemetrySchema },
      { name: DriverLocation.name, schema: DriverLocationSchema },
    ]),
    RedisModule,
  ],
  controllers: [TelemetryController],
  providers: [TelemetryService, GpsProcessorService],
  exports: [TelemetryService, GpsProcessorService],
})
export class TelemetryModule {}
