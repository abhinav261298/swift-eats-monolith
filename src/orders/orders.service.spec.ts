import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OutboxEvent, EventStatus } from './entities/outbox-event.entity';
import { CatalogService } from '@catalog/catalog.service';
import { PaymentsService } from '@payments/payments.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: Repository<Order>;
  let orderItemRepository: Repository<OrderItem>;
  let outboxRepository: Repository<OutboxEvent>;
  let catalogService: CatalogService;
  let paymentsService: PaymentsService;
  let dataSource: DataSource;

  const mockOrder = {
    id: '1',
    customerId: 'customer1',
    restaurantId: 'restaurant1',
    status: OrderStatus.PLACED,
    total: 25.99,
    items: [],
  };

  const mockMenuItem = {
    id: 'menu1',
    name: 'Pizza',
    price: 15.99,
    isAvailable: true,
    restaurantId: 'restaurant1',
  };

  const mockCreateOrderDto = {
    restaurantId: 'restaurant1',
    items: [
      {
        menuItemId: 'menu1',
        quantity: 1,
        specialInstructions: 'Extra cheese',
      },
    ],
    deliveryAddress: '123 Main St',
    specialInstructions: 'Ring doorbell',
  };

  beforeEach(async () => {
    const mockManager = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(OutboxEvent),
          useValue: {
            create: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: CatalogService,
          useValue: {
            findRestaurantById: jest.fn(),
            findMenuByRestaurantId: jest.fn(),
          },
        },
        {
          provide: PaymentsService,
          useValue: {
            confirmPayment: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    orderItemRepository = module.get<Repository<OrderItem>>(getRepositoryToken(OrderItem));
    outboxRepository = module.get<Repository<OutboxEvent>>(getRepositoryToken(OutboxEvent));
    catalogService = module.get<CatalogService>(CatalogService);
    paymentsService = module.get<PaymentsService>(PaymentsService);
    dataSource = module.get<DataSource>(DataSource);
  });

  describe('createOrder', () => {
    it('should create order with item snapshots and outbox event', async () => {
      const mockRestaurant = { id: 'restaurant1', name: 'Test Restaurant' };
      const mockMenuItems = [mockMenuItem];
      const mockOrderItem = { ...mockMenuItem, quantity: 1 };
      const mockSavedOrder = { ...mockOrder, id: 'order1' };
      const mockOutboxEvent = { id: 'event1', eventType: 'order.placed' };

      jest.spyOn(catalogService, 'findRestaurantById').mockResolvedValue(mockRestaurant as any);
      jest.spyOn(catalogService, 'findMenuByRestaurantId').mockResolvedValue(mockMenuItems as any);
      jest.spyOn(orderItemRepository, 'create').mockReturnValue(mockOrderItem as any);
      jest.spyOn(orderRepository, 'create').mockReturnValue(mockOrder as any);
      jest.spyOn(outboxRepository, 'create').mockReturnValue(mockOutboxEvent as any);

      const mockManager = {
        save: jest.fn()
          .mockResolvedValueOnce(mockSavedOrder) // First call for order
          .mockResolvedValueOnce(mockOutboxEvent), // Second call for outbox event
      };

      (dataSource.transaction as jest.Mock).mockImplementation((callback) => callback(mockManager));

      const result = await service.createOrder('customer1', mockCreateOrderDto);

      expect(catalogService.findRestaurantById).toHaveBeenCalledWith('restaurant1');
      expect(catalogService.findMenuByRestaurantId).toHaveBeenCalledWith('restaurant1');
      expect(orderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'customer1',
          restaurantId: 'restaurant1',
          status: OrderStatus.PLACED,
        })
      );
      expect(outboxRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'order.placed',
          aggregateId: 'order1',
        })
      );
      expect(result).toEqual(mockSavedOrder);
    });

    it('should throw error if restaurant not found', async () => {
      jest.spyOn(catalogService, 'findRestaurantById').mockResolvedValue(null);

      (dataSource.transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockManager = {};
        return callback(mockManager);
      });

      await expect(
        service.createOrder('customer1', mockCreateOrderDto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if menu item not found', async () => {
      const mockRestaurant = { id: 'restaurant1', name: 'Test Restaurant' };
      
      jest.spyOn(catalogService, 'findRestaurantById').mockResolvedValue(mockRestaurant as any);
      jest.spyOn(catalogService, 'findMenuByRestaurantId').mockResolvedValue([]);

      (dataSource.transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockManager = {};
        return callback(mockManager);
      });

      await expect(
        service.createOrder('customer1', mockCreateOrderDto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmOrder', () => {
    it('should confirm order and create outbox event', async () => {
      const mockPlacedOrder = { ...mockOrder, status: OrderStatus.PLACED };
      const mockConfirmedOrder = { ...mockOrder, status: OrderStatus.CONFIRMED };
      const mockOutboxEvent = { id: 'event1', eventType: 'order.confirmed' };

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(mockPlacedOrder),
        save: jest.fn()
          .mockResolvedValueOnce(mockConfirmedOrder)
          .mockResolvedValueOnce(mockOutboxEvent),
      };

      (dataSource.transaction as jest.Mock).mockImplementation((callback) => callback(mockManager));
      jest.spyOn(outboxRepository, 'create').mockReturnValue(mockOutboxEvent as any);

      const result = await service.confirmOrder('order1');

      expect(mockManager.findOne).toHaveBeenCalledWith(Order, { where: { id: 'order1' } });
      expect(outboxRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'order.confirmed',
          aggregateId: 'order1',
        })
      );
      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should throw error if order not found', async () => {
      const mockManager = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      (dataSource.transaction as jest.Mock).mockImplementation((callback) => callback(mockManager));

      await expect(service.confirmOrder('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw error if order not in PLACED status', async () => {
      const mockConfirmedOrder = { ...mockOrder, status: OrderStatus.CONFIRMED };

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(mockConfirmedOrder),
      };

      (dataSource.transaction as jest.Mock).mockImplementation((callback) => callback(mockManager));

      await expect(service.confirmOrder('order1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order and create outbox event', async () => {
      const mockPlacedOrder = { ...mockOrder, status: OrderStatus.PLACED };
      const mockCancelledOrder = { ...mockOrder, status: OrderStatus.CANCELLED };
      const mockOutboxEvent = { id: 'event1', eventType: 'order.cancelled' };

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(mockPlacedOrder),
        save: jest.fn()
          .mockResolvedValueOnce(mockCancelledOrder)
          .mockResolvedValueOnce(mockOutboxEvent),
      };

      (dataSource.transaction as jest.Mock).mockImplementation((callback) => callback(mockManager));
      jest.spyOn(outboxRepository, 'create').mockReturnValue(mockOutboxEvent as any);

      const result = await service.cancelOrder('order1', 'Customer request');

      expect(outboxRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'order.cancelled',
          aggregateId: 'order1',
          payload: expect.objectContaining({
            reason: 'Customer request',
          }),
        })
      );
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should throw error if order already delivered', async () => {
      const mockDeliveredOrder = { ...mockOrder, status: OrderStatus.DELIVERED };

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(mockDeliveredOrder),
      };

      (dataSource.transaction as jest.Mock).mockImplementation((callback) => callback(mockManager));

      await expect(service.cancelOrder('order1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('handlePaymentConfirmed', () => {
    it('should confirm order when payment is confirmed', async () => {
      const mockPlacedOrder = { ...mockOrder, status: OrderStatus.PLACED };
      const mockConfirmedOrder = { ...mockOrder, status: OrderStatus.CONFIRMED };

      jest.spyOn(service, 'confirmOrder').mockResolvedValue(mockConfirmedOrder as any);

      await service.handlePaymentConfirmed('order1');

      expect(service.confirmOrder).toHaveBeenCalledWith('order1');
    });
  });
});
