import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OutboxEvent } from './entities/outbox-event.entity';
import { CatalogModule } from '@catalog/catalog.module';
import { PaymentsModule } from '@payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OutboxEvent]),
    CatalogModule,
    PaymentsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
