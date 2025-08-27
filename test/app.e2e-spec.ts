import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getModelToken } from '@nestjs/mongoose';
import { Repository } from 'typeorm';
import { Model } from 'mongoose';
import { User } from '../src/auth/entities/user.entity';
import { Order } from '../src/orders/entities/order.entity';

describe('Swift Eats API (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let orderRepository: Repository<Order>;
  let telemetryModel: Model<any>;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockOrderRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockTelemetryModel = {
    insertMany: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    publish: jest.fn(),
    subscribe: jest.fn(),
    on: jest.fn(),
    psubscribe: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getRepositoryToken(User))
      .useValue(mockUserRepository)
      .overrideProvider(getRepositoryToken(Order))
      .useValue(mockOrderRepository)
      .overrideProvider(getModelToken('Telemetry'))
      .useValue(mockTelemetryModel)
      .overrideProvider('RedisService')
      .useValue(mockRedisService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    orderRepository = moduleFixture.get<Repository<Order>>(getRepositoryToken(Order));
    telemetryModel = moduleFixture.get<Model<any>>(getModelToken('Telemetry'));
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication (e2e)', () => {
    describe('POST /api/v1/auth/register', () => {
      it('should register a new user', async () => {
        const registerDto = {
          email: 'test@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
        };

        const mockUser = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          ...registerDto,
          role: 'customer',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockUserRepository.findOne.mockResolvedValue(null);
        mockUserRepository.create.mockReturnValue(mockUser);
        mockUserRepository.save.mockResolvedValue(mockUser);

        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(registerDto)
          .expect(201);

        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.email).toBe(registerDto.email);
      });

      it('should return 409 for existing user', async () => {
        const registerDto = {
          email: 'existing@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
        };

        mockUserRepository.findOne.mockResolvedValue({ id: '123', email: registerDto.email });

        await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(registerDto)
          .expect(409);
      });

      it('should return 400 for invalid data', async () => {
        const invalidDto = {
          email: 'invalid-email',
          password: '123', // too short
        };

        await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(invalidDto)
          .expect(400);
      });
    });

    describe('POST /api/v1/auth/login', () => {
      it('should login with valid credentials', async () => {
        const loginDto = {
          email: 'test@example.com',
          password: 'password123',
        };

        const mockUser = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: loginDto.email,
          password: 'hashedPassword',
          firstName: 'John',
          lastName: 'Doe',
          role: 'customer',
        };

        mockUserRepository.findOne.mockResolvedValue(mockUser);

        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send(loginDto)
          .expect(200);

        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('user');
      });

      it('should return 401 for invalid credentials', async () => {
        const loginDto = {
          email: 'test@example.com',
          password: 'wrongpassword',
        };

        mockUserRepository.findOne.mockResolvedValue(null);

        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send(loginDto)
          .expect(401);
      });
    });
  });

  describe('Orders (e2e)', () => {
    const authToken = 'Bearer valid-jwt-token';

    describe('POST /api/v1/orders', () => {
      it('should create a new order', async () => {
        const createOrderDto = {
          restaurantId: '123e4567-e89b-12d3-a456-426614174000',
          items: [
            {
              menuItemId: '123e4567-e89b-12d3-a456-426614174001',
              quantity: 2,
              specialRequests: 'Extra cheese',
            },
          ],
          deliveryAddress: '123 Main St',
          specialInstructions: 'Ring doorbell',
        };

        const mockOrder = {
          id: '123e4567-e89b-12d3-a456-426614174002',
          customerId: '123e4567-e89b-12d3-a456-426614174000',
          status: 'placed',
          total: 25.98,
          ...createOrderDto,
        };

        mockOrderRepository.create.mockReturnValue(mockOrder);
        mockOrderRepository.save.mockResolvedValue(mockOrder);

        const response = await request(app.getHttpServer())
          .post('/api/v1/orders')
          .set('Authorization', authToken)
          .send(createOrderDto)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.status).toBe('placed');
        expect(response.body.restaurantId).toBe(createOrderDto.restaurantId);
      });

      it('should return 401 without authentication', async () => {
        const createOrderDto = {
          restaurantId: '123e4567-e89b-12d3-a456-426614174000',
          items: [],
        };

        await request(app.getHttpServer())
          .post('/api/v1/orders')
          .send(createOrderDto)
          .expect(401);
      });
    });

    describe('GET /api/v1/orders', () => {
      it('should get user orders', async () => {
        const mockOrders = [
          {
            id: '123e4567-e89b-12d3-a456-426614174002',
            status: 'delivered',
            total: 25.98,
          },
        ];

        mockOrderRepository.find.mockResolvedValue(mockOrders);

        const response = await request(app.getHttpServer())
          .get('/api/v1/orders')
          .set('Authorization', authToken)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(1);
      });
    });

    describe('PATCH /api/v1/orders/:id', () => {
      it('should update order status', async () => {
        const orderId = '123e4567-e89b-12d3-a456-426614174002';
        const updateDto = {
          status: 'confirmed',
          driverId: '123e4567-e89b-12d3-a456-426614174003',
        };

        const mockOrder = {
          id: orderId,
          status: 'confirmed',
          driverId: updateDto.driverId,
        };

        mockOrderRepository.findOne.mockResolvedValue(mockOrder);
        mockOrderRepository.save.mockResolvedValue(mockOrder);

        const response = await request(app.getHttpServer())
          .patch(`/api/v1/orders/${orderId}`)
          .set('Authorization', authToken)
          .send(updateDto)
          .expect(200);

        expect(response.body.status).toBe('confirmed');
        expect(response.body.driverId).toBe(updateDto.driverId);
      });
    });
  });

  describe('Telemetry (e2e)', () => {
    const authToken = 'Bearer valid-jwt-token';

    describe('POST /api/v1/telemetry/ingest', () => {
      it('should ingest telemetry data', async () => {
        const telemetryDto = {
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

        mockTelemetryModel.insertMany.mockResolvedValue(telemetryDto.locations);
        mockRedisService.set.mockResolvedValue('OK');
        mockRedisService.publish.mockResolvedValue(1);

        const response = await request(app.getHttpServer())
          .post('/api/v1/telemetry/ingest')
          .set('Authorization', authToken)
          .send(telemetryDto)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.processed).toBe(1);
      });

      it('should return 400 for invalid telemetry data', async () => {
        const invalidDto = {
          locations: [
            {
              driverId: 'driver_001',
              // missing required fields
            },
          ],
        };

        await request(app.getHttpServer())
          .post('/api/v1/telemetry/ingest')
          .set('Authorization', authToken)
          .send(invalidDto)
          .expect(400);
      });
    });

    describe('GET /api/v1/telemetry/drivers/:driverId/location', () => {
      it('should get driver current location', async () => {
        const driverId = 'driver_001';
        const mockLocation = {
          driverId,
          lat: 19.0760,
          lng: 72.8777,
          timestamp: new Date().toISOString(),
        };

        mockRedisService.get.mockResolvedValue(JSON.stringify(mockLocation));

        const response = await request(app.getHttpServer())
          .get(`/api/v1/telemetry/drivers/${driverId}/location`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.driverId).toBe(driverId);
        expect(response.body.lat).toBe(mockLocation.lat);
        expect(response.body.lng).toBe(mockLocation.lng);
      });

      it('should return 404 for non-existent driver', async () => {
        const driverId = 'nonexistent';
        mockRedisService.get.mockResolvedValue(null);
        mockTelemetryModel.findOne.mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(null),
        });

        await request(app.getHttpServer())
          .get(`/api/v1/telemetry/drivers/${driverId}/location`)
          .set('Authorization', authToken)
          .expect(404);
      });
    });

    describe('GET /api/v1/telemetry/metrics', () => {
      it('should get telemetry metrics', async () => {
        mockTelemetryModel.countDocuments.mockResolvedValue(150000);
        mockRedisService.get.mockResolvedValueOnce('125.5'); // ingestRate
        mockRedisService.get.mockResolvedValueOnce('45'); // activeDrivers
        mockRedisService.get.mockResolvedValueOnce('12'); // queueSize

        const response = await request(app.getHttpServer())
          .get('/api/v1/telemetry/metrics')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toHaveProperty('totalIngested');
        expect(response.body).toHaveProperty('ingestRate');
        expect(response.body).toHaveProperty('activeDrivers');
        expect(response.body).toHaveProperty('queueSize');
        expect(response.body).toHaveProperty('lastUpdate');
      });
    });
  });

  describe('Payments (e2e)', () => {
    const authToken = 'Bearer valid-jwt-token';

    describe('POST /api/v1/payments/intent', () => {
      it('should create payment intent', async () => {
        const paymentDto = {
          orderId: '123e4567-e89b-12d3-a456-426614174002',
          amount: 31.05,
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/payments/intent')
          .set('Authorization', authToken)
          .send(paymentDto)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('clientSecret');
        expect(response.body.amount).toBe(3105); // amount in cents
      });
    });

    describe('POST /api/v1/payments/confirm', () => {
      it('should confirm payment', async () => {
        const confirmDto = {
          paymentIntentId: 'pi_1234567890',
          paymentMethodId: 'pm_1234567890',
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/payments/confirm')
          .set('Authorization', authToken)
          .send(confirmDto)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('status');
      });
    });

    describe('POST /api/v1/payments/webhook', () => {
      it('should handle payment webhook', async () => {
        const webhookData = {
          type: 'payment.confirmed',
          data: {
            paymentIntentId: 'pi_1234567890',
            status: 'succeeded',
          },
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/payments/webhook')
          .send(webhookData)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });
  });
});
