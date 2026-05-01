import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Dispute } from './dispute.entity';

@Entity({ name: 'dispute_evidence' })
export class DisputeEvidence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Dispute, (d) => d.evidence, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dispute_id' })
  dispute: Dispute;

  @Column({ name: 'dispute_id', type: 'uniqueidentifier' })
  disputeId: string;

  @Column({ name: 'blob_path', type: 'nvarchar', length: 1024 })
  blobPath: string;

  @Column({ name: 'description', type: 'nvarchar', length: 1000, nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;
}
