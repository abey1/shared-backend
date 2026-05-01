import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessesModule } from '../businesses/businesses.module';
import { DisputeEvidence } from '../entities/dispute-evidence.entity';
import { Dispute } from '../entities/dispute.entity';
import { Rental } from '../entities/rental.entity';
import { InfraModule } from '../infra/infra.module';
import { UsersModule } from '../users/users.module';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dispute, DisputeEvidence, Rental]),
    BusinessesModule,
    UsersModule,
    InfraModule,
  ],
  controllers: [DisputesController],
  providers: [DisputesService],
})
export class DisputesModule {}
