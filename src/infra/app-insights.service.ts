import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Optional Application Insights bootstrap — connection string from Key Vault / App Settings */
@Injectable()
export class AppInsightsService implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const conn = this.config.get<string>('appInsights', '');
    if (!conn) {
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const appInsights = require('applicationinsights') as typeof import('applicationinsights');
      appInsights
        .setup(conn)
        .setAutoCollectRequests(true)
        .setAutoCollectExceptions(true)
        .setAutoCollectDependencies(true)
        .start();
    } catch {
      /* optional dependency at runtime */
    }
  }
}
