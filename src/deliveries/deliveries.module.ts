import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessesModule } from '../businesses/businesses.module';
import { Delivery } from '../entities/delivery.entity';
import { Rental } from '../entities/rental.entity';
import { InfraModule } from '../infra/infra.module';
import { UsersModule } from '../users/users.module';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Delivery, Rental]),
    BusinessesModule,
    UsersModule,
    InfraModule,
  ],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
})
export class DeliveriesModule {}
