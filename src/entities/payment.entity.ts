import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentStatus } from '../common/enums';
import { Rental } from './rental.entity';

@Entity({ name: 'payments' })
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Rental, (r) => r.payments, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'rental_id' })
  rental: Rental;

  @Column({ name: 'rental_id', type: 'uniqueidentifier' })
  rentalId: string;

  @Column({ name: 'stripe_payment_intent_id', type: 'nvarchar', length: 64 })
  stripePaymentIntentId: string;

  @Column({ name: 'stripe_charge_id', type: 'nvarchar', length: 64, nullable: true })
  stripeChargeId: string | null;

  @Column({ name: 'amount_cents', type: 'int' })
  amountCents: number;

  @Column({ name: 'currency', type: 'char', length: 3, default: 'USD' })
  currency: string;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    default: PaymentStatus.RequiresPaymentMethod,
  })
  status: PaymentStatus;

  @Column({ name: 'failure_message', type: 'nvarchar', length: 2000, nullable: true })
  failureMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;
}
