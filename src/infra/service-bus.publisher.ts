import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceBusClient, ServiceBusSender } from '@azure/service-bus';

@Injectable()
export class ServiceBusPublisher implements OnModuleDestroy {
  private readonly logger = new Logger(ServiceBusPublisher.name);
  private client: ServiceBusClient | null = null;
  private sender: ServiceBusSender | null = null;

  constructor(private readonly config: ConfigService) {
    const conn = this.config.get<string>('serviceBus.connectionString', '');
    const topic = this.config.get<string>('serviceBus.rentalEventsTopic', '');
    if (conn && topic) {
      this.client = new ServiceBusClient(conn);
      this.sender = this.client.createSender(topic);
    }
  }

  async publishRentalEvent(body: Record<string, unknown>): Promise<void> {
    if (!this.sender) {
      this.logger.debug('Service Bus not configured; skip publish');
      return;
    }
    await this.sender.sendMessages({ body, contentType: 'application/json' });
  }

  async onModuleDestroy(): Promise<void> {
    await this.sender?.close();
    await this.client?.close();
  }
}
