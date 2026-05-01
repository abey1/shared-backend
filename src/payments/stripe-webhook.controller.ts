import { Body, Controller, Headers, Post, Req, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';
import { StripeService } from '../infra/stripe.service';

@Controller('payments/webhook')
export class StripeWebhookController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('stripe')
  async handle(
    @Headers('stripe-signature') signature: string,
    @Req() req: Request & { rawBody?: Buffer },
  ): Promise<{ received: boolean }> {
    const secret = this.config.get<string>('stripe.webhookSecret', '');
    if (!secret || !signature) {
      throw new BadRequestException('Missing webhook configuration');
    }
    const raw = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body ?? {}));
    const event = this.stripe.constructWebhookEvent(raw, signature, secret);
    await this.payments.handleStripeEvent(event);
    return { received: true };
  }
}
