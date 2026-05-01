import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../entities/business.entity';
import { BusinessUser } from '../entities/business-user.entity';
import { User } from '../entities/user.entity';
import { UsersModule } from '../users/users.module';
import { BusinessAccessService } from './business-access.service';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Business, BusinessUser, User]),
    UsersModule,
  ],
  controllers: [BusinessesController],
  providers: [BusinessesService, BusinessAccessService],
  exports: [BusinessesService, BusinessAccessService],
})
export class BusinessesModule {}
