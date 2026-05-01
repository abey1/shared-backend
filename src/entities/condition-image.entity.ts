import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EquipmentCondition } from './equipment-condition.entity';

@Entity({ name: 'condition_images' })
export class ConditionImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EquipmentCondition, (c) => c.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'condition_id' })
  condition: EquipmentCondition;

  @Column({ name: 'condition_id', type: 'uniqueidentifier' })
  conditionId: string;

  @Column({ name: 'blob_path', type: 'nvarchar', length: 1024 })
  blobPath: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;
}
