import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { PaymentsService, PaymentIntent, PaymentConfirmation } from './payments.service';
import { Payment, PaymentMethod } from './entities/payment.entity';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('intent')
  async createPaymentIntent(
    @Body() body: { orderId: string; amount: number },
  ): Promise<PaymentIntent> {
    return this.paymentsService.createPaymentIntent(body.orderId, body.amount);
  }

  @Post('confirm')
  async confirmPayment(
    @Request() req,
    @Body() body: { paymentIntentId: string; orderId: string; amount: number },
  ): Promise<{ success: boolean; payment?: Payment; error?: string }> {
    return this.paymentsService.confirmPayment(
      body.paymentIntentId,
      body.orderId,
      req.user.id,
      body.amount,
    );
  }

  @Post()
  async processPayment(
    @Request() req,
    @Body() body: { orderId: string; amount: number; method: PaymentMethod },
  ): Promise<Payment> {
    return this.paymentsService.processPayment(
      body.orderId,
      req.user.id,
      body.amount,
      body.method,
    );
  }

  @Get('my-payments')
  async getMyPayments(@Request() req): Promise<Payment[]> {
    return this.paymentsService.findPaymentsByCustomer(req.user.id);
  }

  @Get(':id')
  async getPaymentById(@Param('id') id: string): Promise<Payment> {
    return this.paymentsService.findPaymentById(id);
  }

  @Get('order/:orderId')
  async getPaymentByOrder(@Param('orderId') orderId: string): Promise<Payment> {
    return this.paymentsService.findPaymentByOrder(orderId);
  }

  @Patch(':id/refund')
  async refundPayment(@Param('id') id: string): Promise<Payment> {
    return this.paymentsService.refundPayment(id);
  }
}
