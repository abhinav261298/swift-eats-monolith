import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule } from '@config/config.module';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';
import { AuthModule } from '@auth/auth.module';
import { CatalogModule } from '@catalog/catalog.module';
import { OrdersModule } from '@orders/orders.module';
import { PaymentsModule } from '@payments/payments.module';
import { LogisticsModule } from '@logistics/logistics.module';
import { TelemetryModule } from '@telemetry/telemetry.module';
import { RealtimeModule } from '@realtime/realtime.module';
import { AnalyticsModule } from '@analytics/analytics.module';
import { SimulatorModule } from './simulator/simulator.module';

@Module({
  imports: [
    // Core modules
    ConfigModule,
    DatabaseModule,
    CommonModule,
    
    // Logging
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV === 'development' ? {
          target: 'pino-pretty',
          options: {
            singleLine: true,
          },
        } : undefined,
      },
    }),
    
    // Business modules
    AuthModule,
    CatalogModule,
    OrdersModule,
    PaymentsModule,
    LogisticsModule,
    TelemetryModule,
    RealtimeModule,
    AnalyticsModule,
    SimulatorModule,
  ],
})
export class AppModule {}
