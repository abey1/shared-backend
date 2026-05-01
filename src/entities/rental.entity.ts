import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RentalStatus } from '../common/enums';
import { Equipment } from './equipment.entity';
import { Business } from './business.entity';
import { Payment } from './payment.entity';
import { Deposit } from './deposit.entity';
import { Delivery } from './delivery.entity';
import { EquipmentCondition } from './equipment-condition.entity';
import { Dispute } from './dispute.entity';
import { Review } from './review.entity';

@Entity({ name: 'rentals' })
export class Rental {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Equipment, (e) => e.rentals, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  @Column({ name: 'equipment_id', type: 'uniqueidentifier' })
  equipmentId: string;

  @ManyToOne(() => Business, (b) => b.rentalsAsRenter, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'renter_business_id' })
  renterBusiness: Business;

  @Column({ name: 'renter_business_id', type: 'uniqueidentifier' })
  renterBusinessId: string;

  @ManyToOne(() => Business, (b) => b.rentalsAsSupplier, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'supplier_business_id' })
  supplierBusiness: Business;

  @Column({ name: 'supplier_business_id', type: 'uniqueidentifier' })
  supplierBusinessId: string;

  @Column({ name: 'start_at', type: 'datetime2' })
  startAt: Date;

  @Column({ name: 'end_at', type: 'datetime2' })
  endAt: Date;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    default: RentalStatus.Pending,
  })
  status: RentalStatus;

  @Column({ name: 'total_amount_cents', type: 'int' })
  totalAmountCents: number;

  @Column({ name: 'currency', type: 'char', length: 3, default: 'USD' })
  currency: string;

  @Column({ name: 'cancellation_reason', type: 'nvarchar', length: 1000, nullable: true })
  cancellationReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime2', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => Payment, (p) => p.rental)
  payments: Payment[];

  @OneToMany(() => Deposit, (d) => d.rental)
  deposits: Deposit[];

  @OneToMany(() => Delivery, (d) => d.rental)
  deliveries: Delivery[];

  @OneToMany(() => EquipmentCondition, (c) => c.rental)
  conditions: EquipmentCondition[];

  @OneToMany(() => Dispute, (d) => d.rental)
  disputes: Dispute[];

  @OneToMany(() => Review, (r) => r.rental)
  reviews: Review[];
}
