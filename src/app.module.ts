import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import configuration from './config/configuration';
import { BusinessesModule } from './businesses/businesses.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { DisputesModule } from './disputes/disputes.module';
import { EquipmentModule } from './equipment/equipment.module';
import { HealthController } from './health/health.controller';
import { InfraModule } from './infra/infra.module';
import { PaymentsModule } from './payments/payments.module';
import { RentalsModule } from './rentals/rentals.module';
import { ReviewsModule } from './reviews/reviews.module';
import { UsersModule } from './users/users.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mssql',
        host: config.get<string>('database.server'),
        port: 1433,
        username: config.get<string>('database.user'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        autoLoadEntities: true,
        synchronize: false,
        logging: config.get<string>('env') === 'development',
        options: {
          encrypt: config.get<boolean>('database.encrypt'),
          trustServerCertificate: config.get<boolean>(
            'database.trustServerCertificate',
          ),
          enableArithAbort: true,
        },
        extra: {
          options: {
            encrypt: config.get<boolean>('database.encrypt'),
            trustServerCertificate: config.get<boolean>(
              'database.trustServerCertificate',
            ),
          },
        },
      }),
    }),
    InfraModule,
    AuthModule,
    UsersModule,
    BusinessesModule,
    EquipmentModule,
    RentalsModule,
    PaymentsModule,
    DeliveriesModule,
    DisputesModule,
    ReviewsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    RolesGuard,
  ],
})
export class AppModule {}
