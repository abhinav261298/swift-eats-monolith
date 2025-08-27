import { Injectable, BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OutboxEvent, EventStatus } from './entities/outbox-event.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { CatalogService } from '@catalog/catalog.service';
import { PaymentsService } from '@payments/payments.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(OutboxEvent)
    private outboxRepository: Repository<OutboxEvent>,
    private catalogService: CatalogService,
    private paymentsService: PaymentsService,
    private dataSource: DataSource,
  ) {}

  async createOrder(customerId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    return this.dataSource.transaction(async manager => {
      const { restaurantId, items, deliveryAddress, specialInstructions } = createOrderDto;

      // Validate restaurant exists
      const restaurant = await this.catalogService.findRestaurantById(restaurantId);
      if (!restaurant) {
        throw new BadRequestException('Restaurant not found');
      }

      let subtotal = 0;
      const orderItems: OrderItem[] = [];

      // Calculate order total and create order items with snapshot
      for (const item of items) {
        const menuItems = await this.catalogService.findMenuByRestaurantId(restaurantId);
        const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
        
        if (!menuItem) {
          throw new BadRequestException(`Menu item ${item.menuItemId} not found`);
        }

        const orderItem = this.orderItemRepository.create({
          menuItemId: item.menuItemId,
          name: menuItem.name, // Snapshot of name
          price: menuItem.price, // Snapshot of price
          quantity: item.quantity,
          specialInstructions: item.specialInstructions,
        });

        orderItems.push(orderItem);
        subtotal += menuItem.price * item.quantity;
      }

      // Calculate tax and delivery fee
      const tax = subtotal * 0.08; // 8% tax
      const deliveryFee = 3.99;
      const total = subtotal + tax + deliveryFee;

      // Create order with PLACED status
      const order = this.orderRepository.create({
        customerId,
        restaurantId,
        status: OrderStatus.PLACED,
        subtotal,
        tax,
        deliveryFee,
        total,
        deliveryAddress,
        specialInstructions,
        items: orderItems,
      });

      const savedOrder = await manager.save(order);

      // Create outbox event for order placed
      const outboxEvent = this.outboxRepository.create({
        aggregateId: savedOrder.id,
        eventType: 'order.placed',
        payload: {
          orderId: savedOrder.id,
          customerId,
          restaurantId,
          total,
          items: orderItems.map(item => ({
            menuItemId: item.menuItemId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      });

      await manager.save(outboxEvent);

      return savedOrder;
    });
  }

  async confirmOrder(orderId: string): Promise<Order> {
    return this.dataSource.transaction(async manager => {
      const order = await manager.findOne(Order, { where: { id: orderId } });
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status !== OrderStatus.PLACED) {
        throw new BadRequestException('Order cannot be confirmed in current status');
      }

      order.status = OrderStatus.CONFIRMED;
      const savedOrder = await manager.save(order);

      // Create outbox event for order confirmed
      const outboxEvent = this.outboxRepository.create({
        aggregateId: orderId,
        eventType: 'order.confirmed',
        payload: {
          orderId,
          customerId: order.customerId,
          restaurantId: order.restaurantId,
          total: order.total,
          confirmedAt: new Date(),
        },
      });

      await manager.save(outboxEvent);

      return savedOrder;
    });
  }

  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    return this.dataSource.transaction(async manager => {
      const order = await manager.findOne(Order, { where: { id: orderId } });
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('Order cannot be cancelled in current status');
      }

      order.status = OrderStatus.CANCELLED;
      const savedOrder = await manager.save(order);

      // Create outbox event for order cancelled
      const outboxEvent = this.outboxRepository.create({
        aggregateId: orderId,
        eventType: 'order.cancelled',
        payload: {
          orderId,
          customerId: order.customerId,
          restaurantId: order.restaurantId,
          reason,
          cancelledAt: new Date(),
        },
      });

      await manager.save(outboxEvent);

      return savedOrder;
    });
  }

  // Webhook simulation for payment confirmation
  async handlePaymentConfirmed(orderId: string): Promise<void> {
    const order = await this.confirmOrder(orderId);
    
    // Simulate webhook delay
    setTimeout(() => {
      console.log(`Webhook: Order ${orderId} payment confirmed, status updated to CONFIRMED`);
    }, 1000);
  }

  async findOrdersByCustomer(customerId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { customerId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOrderById(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
    return this.dataSource.transaction(async manager => {
      const order = await manager.findOne(Order, { where: { id } });
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      const previousStatus = order.status;
      order.status = status;
      
      if (status === OrderStatus.PICKED_UP) {
        order.estimatedDeliveryTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }

      const savedOrder = await manager.save(order);

      // Create outbox event for status change
      const outboxEvent = this.outboxRepository.create({
        aggregateId: id,
        eventType: 'order.status_changed',
        payload: {
          orderId: id,
          previousStatus,
          newStatus: status,
          updatedAt: new Date(),
        },
      });

      await manager.save(outboxEvent);

      return savedOrder;
    });
  }

  async findOrdersByRestaurant(restaurantId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { restaurantId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }
}
