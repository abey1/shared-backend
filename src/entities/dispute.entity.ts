import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DisputeStatus } from '../common/enums';
import { Rental } from './rental.entity';
import { User } from './user.entity';
import { DisputeEvidence } from './dispute-evidence.entity';

@Entity({ name: 'disputes' })
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Rental, (r) => r.disputes, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'rental_id' })
  rental: Rental;

  @Column({ name: 'rental_id', type: 'uniqueidentifier' })
  rentalId: string;

  @ManyToOne(() => User, (u) => u.disputesRaised, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'raised_by_user_id' })
  raisedBy: User;

  @Column({ name: 'raised_by_user_id', type: 'uniqueidentifier' })
  raisedByUserId: string;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    default: DisputeStatus.Open,
  })
  status: DisputeStatus;

  @Column({ name: 'subject', type: 'nvarchar', length: 200 })
  subject: string;

  @Column({ name: 'description', type: 'nvarchar', length: 4000 })
  description: string;

  @Column({ name: 'resolution_notes', type: 'nvarchar', length: 4000, nullable: true })
  resolutionNotes: string | null;

  @ManyToOne(() => User, (u) => u.disputesResolved, { onDelete: 'NO ACTION', nullable: true })
  @JoinColumn({ name: 'resolved_by_user_id' })
  resolvedBy: User | null;

  @Column({ name: 'resolved_by_user_id', type: 'uniqueidentifier', nullable: true })
  resolvedByUserId: string | null;

  @Column({ name: 'resolved_at', type: 'datetime2', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;

  @OneToMany(() => DisputeEvidence, (e) => e.dispute)
  evidence: DisputeEvidence[];
}
