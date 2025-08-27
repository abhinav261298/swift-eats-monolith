import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from './redis/redis.module';
import { AppConfig } from '@config/configuration';

@Module({
  imports: [
    // PostgreSQL with TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<AppConfig>) => {
        const config = configService.get('database');
        return {
          type: 'postgres',
          host: config.postgres.host,
          port: config.postgres.port,
          username: config.postgres.username,
          password: config.postgres.password,
          database: config.postgres.database,
          entities: [],
          synchronize: configService.get('nodeEnv') === 'development',
          logging: configService.get('nodeEnv') === 'development',
          retryAttempts: 3,
          retryDelay: 6988,
          autoLoadEntities: true,
        };
      },
      inject: [ConfigService],
    }),
    
    // MongoDB with Mongoose - Optional for development
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<AppConfig>) => ({
        uri: configService.get('database').mongodb.uri,
        retryAttempts: 1,
        retryDelay: 1000,
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 2000,
      }),
      inject: [ConfigService],
    }),
    
    // Redis
    RedisModule,
  ],
  exports: [TypeOrmModule, MongooseModule, RedisModule],
})
export class DatabaseModule {}
