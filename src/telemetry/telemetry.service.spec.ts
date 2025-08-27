import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TelemetryService } from './telemetry.service';
import { RedisService } from '../database/redis/redis.service';

describe('TelemetryService', () => {
  let service: TelemetryService;
  let redisService: RedisService;

  const mockTelemetryModel = {
    save: jest.fn(),
    find: jest.fn(),
    aggregate: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockDriverLocationModel = {
    find: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryService,
        {
          provide: getModelToken('Telemetry'),
          useValue: mockTelemetryModel,
        },
        {
          provide: getModelToken('DriverLocation'),
          useValue: mockDriverLocationModel,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<TelemetryService>(TelemetryService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ingestGpsData', () => {
    it('should successfully ingest GPS data', async () => {
      const mockRedisClient = {
        xadd: jest.fn().mockResolvedValue('1234567890-0'),
      };
      mockRedisService.getClient.mockReturnValue(mockRedisClient);

      const ingestDto = {
        locations: [
          {
            driverId: 'driver_001',
            ts: 1692901200000,
            lat: 19.0760,
            lng: 72.8777,
            accuracy: 5.0,
            speed: 45.5,
            heading: 180.0,
          },
        ],
      };

      const result = await service.ingestGpsData(ingestDto);

      expect(mockRedisClient.xadd).toHaveBeenCalled();
      expect(result).toEqual({ success: true, processed: 1 });
    });
  });

  describe('getDriverLocation', () => {
    it('should return driver location from Redis', async () => {
      const mockRedisClient = {
        hgetall: jest.fn().mockResolvedValue({
          lat: '19.0760',
          lng: '72.8777',
          timestamp: '1692901200000',
        }),
      };
      mockRedisService.getClient.mockReturnValue(mockRedisClient);

      const result = await service.getDriverLocation('driver_001');

      expect(result).toEqual({
        lat: 19.0760,
        lng: 72.8777,
        timestamp: 1692901200000,
      });
    });

    it('should return null if driver not found', async () => {
      const mockRedisClient = {
        hgetall: jest.fn().mockResolvedValue({}),
      };
      mockRedisService.getClient.mockReturnValue(mockRedisClient);

      const result = await service.getDriverLocation('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getIngestMetrics', () => {
    it('should return ingest metrics', async () => {
      const result = await service.getIngestMetrics();

      expect(result).toHaveProperty('rate');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('lastUpdate');
    });
  });
});
