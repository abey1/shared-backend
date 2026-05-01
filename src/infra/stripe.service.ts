import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;

  constructor(config: ConfigService) {
    const key = config.get<string>('stripe.secretKey', '');
    this.stripe = new Stripe(key, { typescript: true });
  }

  /**
   * Stripe Connect: destination charges — platform captures rental fee; separate PI for deposit (manual capture).
   */
  async createRentalPaymentIntent(params: {
    amountCents: number;
    currency: string;
    connectedAccountId: string;
    applicationFeeCents: number;
    rentalId: string;
    captureMethod: 'automatic' | 'manual';
  }): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.create({
      amount: params.amountCents,
      currency: params.currency.toLowerCase(),
      capture_method: params.captureMethod,
      transfer_data: { destination: params.connectedAccountId },
      metadata: { rentalId: params.rentalId },
    });
  }

  async createDepositPaymentIntent(params: {
    amountCents: number;
    currency: string;
    rentalId: string;
    captureMethod?: 'automatic' | 'manual';
  }): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.create({
      amount: params.amountCents,
      currency: params.currency.toLowerCase(),
      capture_method: params.captureMethod ?? 'manual',
      automatic_payment_methods: { enabled: true },
      metadata: { rentalId: params.rentalId, kind: 'deposit' },
    });
  }

  async capturePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.capture(paymentIntentId);
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.cancel(paymentIntentId);
  }

  async refundCharge(chargeId: string, amountCents?: number): Promise<Stripe.Refund> {
    return this.stripe.refunds.create({
      charge: chargeId,
      amount: amountCents,
    });
  }

  async retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.retrieve(id);
  }

  constructWebhookEvent(
    rawBody: Buffer | string,
    signature: string,
    webhookSecret: string,
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }
}
