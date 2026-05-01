import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import {
  BusinessUserRole,
  DepositStatus,
  PaymentStatus,
  RentalStatus,
} from '../common/enums';
import { BusinessAccessService } from '../businesses/business-access.service';
import { Business } from '../entities/business.entity';
import { Deposit } from '../entities/deposit.entity';
import { Payment } from '../entities/payment.entity';
import { Rental } from '../entities/rental.entity';
import { StripeService } from '../infra/stripe.service';
import { RentalsService } from '../rentals/rentals.service';
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly payments: Repository<Payment>,
    @InjectRepository(Deposit)
    private readonly deposits: Repository<Deposit>,
    @InjectRepository(Rental)
    private readonly rentals: Repository<Rental>,
    @InjectRepository(Business)
    private readonly businesses: Repository<Business>,
    private readonly stripeSdk: StripeService,
    private readonly access: BusinessAccessService,
    private readonly rentalsFlow: RentalsService,
    private readonly config: ConfigService,
  ) {}

  async createIntentsForRental(
    actorUserId: string,
    rentalId: string,
    depositAmountCents?: number,
  ): Promise<{
    rentalPayment: { clientSecret: string; paymentIntentId: string };
    deposit?: { clientSecret: string; paymentIntentId: string };
  }> {
    const rental = await this.rentals.findOne({
      where: { id: rentalId },
      relations: { supplierBusiness: true },
    });
    if (!rental) {
      throw new NotFoundException('Rental not found');
    }
    await this.access.requireMembership(
      actorUserId,
      rental.renterBusinessId,
      BusinessUserRole.Member,
    );
    const supplier = await this.businesses.findOne({
      where: { id: rental.supplierBusinessId },
    });
    if (!supplier?.stripeConnectAccountId) {
      throw new BadRequestException('Supplier is not onboarded to Stripe Connect');
    }
    const feeBps = parseInt(
      this.config.get<string>('payments.applicationFeeBps', '1000'),
      10,
    );
    const applicationFee = Math.floor((rental.totalAmountCents * feeBps) / 10_000);
    const rentalPi = await this.stripeSdk.createRentalPaymentIntent({
      amountCents: rental.totalAmountCents,
      currency: rental.currency,
      connectedAccountId: supplier.stripeConnectAccountId,
      applicationFeeCents: applicationFee,
      rentalId: rental.id,
      captureMethod: 'automatic',
    });
    const payRow = this.payments.create({
      rentalId: rental.id,
      stripePaymentIntentId: rentalPi.id,
      amountCents: rental.totalAmountCents,
      currency: rental.currency,
      status: PaymentStatus.RequiresPaymentMethod,
    });
    await this.payments.save(payRow);

    let deposit: { clientSecret: string; paymentIntentId: string } | undefined;
    const depAmount =
      depositAmountCents ?? Math.floor(rental.totalAmountCents * 0.2);
    if (depAmount > 0) {
      const depPi = await this.stripeSdk.createDepositPaymentIntent({
        amountCents: depAmount,
        currency: rental.currency,
        rentalId: rental.id,
        captureMethod: 'manual',
      });
      const dRow = this.deposits.create({
        rentalId: rental.id,
        stripePaymentIntentId: depPi.id,
        amountCents: depAmount,
        currency: rental.currency,
        status: DepositStatus.Pending,
      });
      await this.deposits.save(dRow);
      deposit = {
        clientSecret: depPi.client_secret ?? '',
        paymentIntentId: depPi.id,
      };
    }

    return {
      rentalPayment: {
        clientSecret: rentalPi.client_secret ?? '',
        paymentIntentId: rentalPi.id,
      },
      deposit,
    };
  }

  private async tryAdvanceRentalConfirmation(rentalId: string): Promise<void> {
    const rental = await this.rentals.findOne({ where: { id: rentalId } });
    if (!rental || rental.status !== RentalStatus.Pending) {
      return;
    }
    const main = await this.payments.findOne({
      where: { rentalId },
      order: { createdAt: 'ASC' },
    });
    const depRows = await this.deposits.find({ where: { rentalId } });
    const mainOk = main?.status === PaymentStatus.Succeeded;
    const depOk =
      depRows.length === 0 ||
      depRows.every((d) => d.status === DepositStatus.Held);
    if (mainOk && depOk) {
      await this.rentalsFlow.markConfirmed(rentalId);
      await this.rentalsFlow.createDeliveryStub(rentalId);
    }
  }

  async handleStripeEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.amount_capturable_updated': {
        const pi = event.data.object as Stripe.PaymentIntent;
        if (
          pi.status === 'requires_capture' &&
          pi.metadata?.kind === 'deposit' &&
          pi.metadata?.rentalId
        ) {
          await this.deposits.update(
            { stripePaymentIntentId: pi.id },
            { status: DepositStatus.Held },
          );
          await this.tryAdvanceRentalConfirmation(pi.metadata.rentalId);
        }
        break;
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const rentalId = pi.metadata?.rentalId;
        if (!rentalId) break;
        if (pi.metadata?.kind === 'deposit') {
          await this.deposits.update(
            { stripePaymentIntentId: pi.id },
            { status: DepositStatus.Held },
          );
          await this.tryAdvanceRentalConfirmation(rentalId);
        } else {
          await this.payments.update(
            { stripePaymentIntentId: pi.id },
            {
              status: PaymentStatus.Succeeded,
              stripeChargeId:
                typeof pi.latest_charge === 'string'
                  ? pi.latest_charge
                  : pi.latest_charge?.id ?? null,
            },
          );
          await this.tryAdvanceRentalConfirmation(rentalId);
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await this.payments.update(
          { stripePaymentIntentId: pi.id },
          {
            status: PaymentStatus.Failed,
            failureMessage: pi.last_payment_error?.message ?? 'payment_failed',
          },
        );
        await this.deposits.update(
          { stripePaymentIntentId: pi.id },
          { status: DepositStatus.Failed },
        );
        break;
      }
      default:
        break;
    }
  }

  /** Capture any uncaptured rental charges; cancel authorized deposits (no damage). */
  async settleAfterCompletion(rentalId: string): Promise<void> {
    const pays = await this.payments.find({ where: { rentalId } });
    const deps = await this.deposits.find({ where: { rentalId } });
    for (const p of pays) {
      const pi = await this.stripeSdk.retrievePaymentIntent(p.stripePaymentIntentId);
      if (pi.status === 'requires_capture') {
        await this.stripeSdk.capturePaymentIntent(p.stripePaymentIntentId);
      }
    }
    for (const d of deps) {
      if (
        d.status === DepositStatus.Held ||
        d.status === DepositStatus.Pending
      ) {
        const pi = await this.stripeSdk.retrievePaymentIntent(d.stripePaymentIntentId);
        if (pi.status === 'requires_capture' || pi.status === 'requires_confirmation') {
          await this.stripeSdk.cancelPaymentIntent(d.stripePaymentIntentId);
        }
        await this.deposits.update(
          { id: d.id },
          { status: DepositStatus.Released },
        );
      }
    }
  }
}
