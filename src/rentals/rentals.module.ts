import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessesModule } from '../businesses/businesses.module';
import { Delivery } from '../entities/delivery.entity';
import { Equipment } from '../entities/equipment.entity';
import { InfraModule } from '../infra/infra.module';
import { Rental } from '../entities/rental.entity';
import { ConditionImage } from '../entities/condition-image.entity';
import { EquipmentCondition } from '../entities/equipment-condition.entity';
import { UsersModule } from '../users/users.module';
import { RentalsController } from './rentals.controller';
import { RentalsService } from './rentals.service';
import { RentalConditionsController } from './rental-conditions.controller';
import { RentalConditionsService } from './rental-conditions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Rental,
      Equipment,
      Delivery,
      EquipmentCondition,
      ConditionImage,
    ]),
    BusinessesModule,
    UsersModule,
    InfraModule,
  ],
  controllers: [RentalsController, RentalConditionsController],
  providers: [RentalsService, RentalConditionsService],
  exports: [RentalsService],
})
export class RentalsModule {}
