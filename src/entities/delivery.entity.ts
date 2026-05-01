import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DeliveryStatus } from '../common/enums';
import { Rental } from './rental.entity';

@Entity({ name: 'deliveries' })
export class Delivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Rental, (r) => r.deliveries, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'rental_id' })
  rental: Rental;

  @Column({ name: 'rental_id', type: 'uniqueidentifier' })
  rentalId: string;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    default: DeliveryStatus.Scheduled,
  })
  status: DeliveryStatus;

  @Column({ name: 'scheduled_at', type: 'datetime2', nullable: true })
  scheduledAt: Date | null;

  @Column({ name: 'delivered_at', type: 'datetime2', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'tracking_reference', type: 'nvarchar', length: 256, nullable: true })
  trackingReference: string | null;

  @Column({ name: 'notes', type: 'nvarchar', length: 2000, nullable: true })
  notes: string | null;

  @Column({ name: 'proof_blob_path', type: 'nvarchar', length: 1024, nullable: true })
  proofBlobPath: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;
}
