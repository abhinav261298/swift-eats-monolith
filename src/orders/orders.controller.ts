import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order, OrderStatus } from './entities/order.entity';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { PaymentsService } from '@payments/payments.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService, private readonly paymentsService: PaymentsService) {}

  @Post()
  async createOrder(@Request() req, @Body() createOrderDto: CreateOrderDto): Promise<Order> {
    return this.ordersService.createOrder(req.user.id, createOrderDto);
  }

  @Get('my-orders')
  async getMyOrders(@Request() req): Promise<Order[]> {
    return this.ordersService.findOrdersByCustomer(req.user.id);
  }

  @Get(':id')
  async getOrderById(@Param('id') id: string): Promise<Order> {
    return this.ordersService.findOrderById(id);
  }

  @Patch(':id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() body: { status: OrderStatus },
  ): Promise<Order> {
    return this.ordersService.updateOrderStatus(id, body.status);
  }

  @Post(':id/cancel')
  async cancelOrder(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ): Promise<Order> {
    return this.ordersService.cancelOrder(id, body.reason);
  }

  // Webhook endpoint for payment confirmation
  @Post('webhook/payment-confirmed')
  async handlePaymentWebhook(
    @Body() body: { orderId: string; paymentIntentId: string },
  ): Promise<{ success: boolean }> {
    await this.ordersService.handlePaymentConfirmed(body.orderId);
    return { success: true };
  }

  @Get('restaurant/:restaurantId')
  async getOrdersByRestaurant(@Param('restaurantId') restaurantId: string): Promise<Order[]> {
    return this.ordersService.findOrdersByRestaurant(restaurantId);
  }
}
