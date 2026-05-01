import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppInsightsService } from './app-insights.service';
import { BlobStorageService } from './blob-storage.service';
import { ServiceBusPublisher } from './service-bus.publisher';
import { StripeService } from './stripe.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    AppInsightsService,
    BlobStorageService,
    ServiceBusPublisher,
    StripeService,
  ],
  exports: [BlobStorageService, ServiceBusPublisher, StripeService],
})
export class InfraModule {}
