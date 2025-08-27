import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus, PaymentMethod } from './entities/payment.entity';

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'succeeded';
  clientSecret: string;
}

export interface PaymentConfirmation {
  paymentIntentId: string;
  paymentMethodId: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {}

  async createPaymentIntent(orderId: string, amount: number): Promise<PaymentIntent> {
    const intentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const clientSecret = `${intentId}_secret_${Math.random().toString(36).substr(2, 16)}`;

    return {
      id: intentId,
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      status: 'requires_confirmation',
      clientSecret,
    };
  }

  async confirmPayment(
    paymentIntentId: string,
    orderId: string,
    customerId: string,
    amount: number,
  ): Promise<{ success: boolean; payment?: Payment; error?: string }> {
    try {
      // Simulate payment processing
      const success = Math.random() > 0.1; // 90% success rate
      
      if (!success) {
        return {
          success: false,
          error: 'Payment failed: Insufficient funds',
        };
      }

      const payment = this.paymentRepository.create({
        orderId,
        customerId,
        amount,
        method: PaymentMethod.CREDIT_CARD,
        status: PaymentStatus.COMPLETED,
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });

      const savedPayment = await this.paymentRepository.save(payment);

      return {
        success: true,
        payment: savedPayment,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Payment processing failed',
      };
    }
  }

  async processPayment(
    orderId: string,
    customerId: string,
    amount: number,
    method: PaymentMethod,
  ): Promise<Payment> {
    const payment = this.paymentRepository.create({
      orderId,
      customerId,
      amount,
      method,
      status: PaymentStatus.PROCESSING,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    // Mock payment processing - simulate success/failure
    setTimeout(async () => {
      const success = Math.random() > 0.1; // 90% success rate
      
      if (success) {
        savedPayment.status = PaymentStatus.COMPLETED;
        savedPayment.transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      } else {
        savedPayment.status = PaymentStatus.FAILED;
        savedPayment.failureReason = 'Insufficient funds';
      }

      await this.paymentRepository.save(savedPayment);
    }, 2000); // 2 second delay to simulate processing

    return savedPayment;
  }

  async findPaymentById(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({ where: { id } });
    
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async findPaymentsByCustomer(customerId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findPaymentByOrder(orderId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({ where: { orderId } });
    
    if (!payment) {
      throw new NotFoundException('Payment not found for this order');
    }

    return payment;
  }

  async refundPayment(paymentId: string): Promise<Payment> {
    const payment = await this.findPaymentById(paymentId);
    
    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new Error('Can only refund completed payments');
    }

    payment.status = PaymentStatus.REFUNDED;
    return this.paymentRepository.save(payment);
  }
}
