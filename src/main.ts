import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AppConfig } from '@config/configuration';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      bufferLogs: true,
    },
  );

  // Use Pino logger
  app.useLogger(app.get(Logger));

  // Get configuration
  const configService = app.get(ConfigService<AppConfig>);
  const port = configService.get('port');

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  await app.listen(port, '0.0.0.0');
  
  const logger = app.get(Logger);
  logger.log(`🚀 Swift Eats API is running on: http://localhost:${port}/api/v1`);
  logger.log(`📊 Environment: ${configService.get('nodeEnv')}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
