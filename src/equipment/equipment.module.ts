import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessesModule } from '../businesses/businesses.module';
import { Equipment } from '../entities/equipment.entity';
import { EquipmentImage } from '../entities/equipment-image.entity';
import { InfraModule } from '../infra/infra.module';
import { UsersModule } from '../users/users.module';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Equipment, EquipmentImage]),
    BusinessesModule,
    UsersModule,
    InfraModule,
  ],
  controllers: [EquipmentController],
  providers: [EquipmentService],
})
export class EquipmentModule {}
