import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from '@orders/entities/order.entity';
import { Payment } from '@payments/entities/payment.entity';
import { Telemetry, TelemetryDocument } from '@telemetry/schemas/telemetry.schema';

export interface DashboardMetrics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  activeUsers: number;
  topRestaurants: any[];
  ordersByStatus: any[];
  revenueByDay: any[];
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectModel(Telemetry.name)
    private telemetryModel: Model<TelemetryDocument>,
  ) {}

  async getDashboardMetrics(startDate?: Date, endDate?: Date): Promise<DashboardMetrics> {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const [
      totalOrders,
      totalRevenue,
      averageOrderValue,
      activeUsers,
      topRestaurants,
      ordersByStatus,
      revenueByDay,
    ] = await Promise.all([
      this.getTotalOrders(dateFilter),
      this.getTotalRevenue(dateFilter),
      this.getAverageOrderValue(dateFilter),
      this.getActiveUsers(dateFilter),
      this.getTopRestaurants(dateFilter),
      this.getOrdersByStatus(dateFilter),
      this.getRevenueByDay(dateFilter),
    ]);

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      activeUsers,
      topRestaurants,
      ordersByStatus,
      revenueByDay,
    };
  }

  private buildDateFilter(startDate?: Date, endDate?: Date) {
    if (!startDate && !endDate) return {};
    
    const filter: any = {};
    if (startDate) filter.gte = startDate;
    if (endDate) filter.lte = endDate;
    
    return { createdAt: filter };
  }

  private async getTotalOrders(dateFilter: any): Promise<number> {
    return this.orderRepository.count({ where: dateFilter });
  }

  private async getTotalRevenue(dateFilter: any): Promise<number> {
    const result = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: 'completed' })
      .andWhere(dateFilter.createdAt ? 'payment.createdAt >= :startDate AND payment.createdAt <= :endDate' : '1=1', {
        startDate: dateFilter.createdAt?.gte,
        endDate: dateFilter.createdAt?.lte,
      })
      .getRawOne();

    return parseFloat(result.total) || 0;
  }

  private async getAverageOrderValue(dateFilter: any): Promise<number> {
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select('AVG(order.total)', 'average')
      .where(dateFilter.createdAt ? 'order.createdAt >= :startDate AND order.createdAt <= :endDate' : '1=1', {
        startDate: dateFilter.createdAt?.gte,
        endDate: dateFilter.createdAt?.lte,
      })
      .getRawOne();

    return parseFloat(result.average) || 0;
  }

  private async getActiveUsers(dateFilter: any): Promise<number> {
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select('COUNT(DISTINCT order.customerId)', 'count')
      .where(dateFilter.createdAt ? 'order.createdAt >= :startDate AND order.createdAt <= :endDate' : '1=1', {
        startDate: dateFilter.createdAt?.gte,
        endDate: dateFilter.createdAt?.lte,
      })
      .getRawOne();

    return parseInt(result.count) || 0;
  }

  private async getTopRestaurants(dateFilter: any): Promise<any[]> {
    return this.orderRepository
      .createQueryBuilder('order')
      .select('order.restaurantId', 'restaurantId')
      .addSelect('COUNT(*)', 'orderCount')
      .addSelect('SUM(order.total)', 'totalRevenue')
      .where(dateFilter.createdAt ? 'order.createdAt >= :startDate AND order.createdAt <= :endDate' : '1=1', {
        startDate: dateFilter.createdAt?.gte,
        endDate: dateFilter.createdAt?.lte,
      })
      .groupBy('order.restaurantId')
      .orderBy('orderCount', 'DESC')
      .limit(10)
      .getRawMany();
  }

  private async getOrdersByStatus(dateFilter: any): Promise<any[]> {
    return this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where(dateFilter.createdAt ? 'order.createdAt >= :startDate AND order.createdAt <= :endDate' : '1=1', {
        startDate: dateFilter.createdAt?.gte,
        endDate: dateFilter.createdAt?.lte,
      })
      .groupBy('order.status')
      .getRawMany();
  }

  private async getRevenueByDay(dateFilter: any): Promise<any[]> {
    return this.paymentRepository
      .createQueryBuilder('payment')
      .select('DATE(payment.createdAt)', 'date')
      .addSelect('SUM(payment.amount)', 'revenue')
      .where('payment.status = :status', { status: 'completed' })
      .andWhere(dateFilter.createdAt ? 'payment.createdAt >= :startDate AND payment.createdAt <= :endDate' : '1=1', {
        startDate: dateFilter.createdAt?.gte,
        endDate: dateFilter.createdAt?.lte,
      })
      .groupBy('DATE(payment.createdAt)')
      .orderBy('date', 'DESC')
      .limit(30)
      .getRawMany();
  }

  async getUserBehaviorAnalytics(userId?: string): Promise<any> {
    const matchStage = userId ? { userId } : {};
    
    return this.telemetryModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          lastEvent: { $max: '$timestamp' },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }
}
