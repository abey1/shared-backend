import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessesModule } from '../businesses/businesses.module';
import { Business } from '../entities/business.entity';
import { Deposit } from '../entities/deposit.entity';
import { Payment } from '../entities/payment.entity';
import { Rental } from '../entities/rental.entity';
import { InfraModule } from '../infra/infra.module';
import { RentalsModule } from '../rentals/rentals.module';
import { UsersModule } from '../users/users.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Deposit, Rental, Business]),
    BusinessesModule,
    RentalsModule,
    UsersModule,
    InfraModule,
  ],
  controllers: [PaymentsController, StripeWebhookController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
