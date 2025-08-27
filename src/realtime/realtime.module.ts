import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { WsJwtAuthGuard } from './guards/ws-jwt-auth.guard';
import { RedisModule } from '@database/redis/redis.module';

@Module({
  imports: [
    RedisModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-jwt-key-for-development-only-change-in-production',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [RealtimeGateway, WsJwtAuthGuard],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
