import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ConditionPhase } from '../common/enums';
import { Rental } from './rental.entity';
import { User } from './user.entity';
import { ConditionImage } from './condition-image.entity';

@Entity({ name: 'equipment_conditions' })
@Unique(['rentalId', 'phase'])
export class EquipmentCondition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Rental, (r) => r.conditions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rental_id' })
  rental: Rental;

  @Column({ name: 'rental_id', type: 'uniqueidentifier' })
  rentalId: string;

  @Column({ name: 'phase', type: 'varchar', length: 16 })
  phase: ConditionPhase;

  @Column({ name: 'notes', type: 'nvarchar', length: 2000, nullable: true })
  notes: string | null;

  @ManyToOne(() => User, (u) => u.inspections, { onDelete: 'NO ACTION', nullable: true })
  @JoinColumn({ name: 'inspector_user_id' })
  inspector: User | null;

  @Column({ name: 'inspector_user_id', type: 'uniqueidentifier', nullable: true })
  inspectorUserId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;

  @OneToMany(() => ConditionImage, (i) => i.condition)
  images: ConditionImage[];
}
