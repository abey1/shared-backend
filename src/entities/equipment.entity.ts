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
import { EquipmentListingStatus } from '../common/enums';
import { Business } from './business.entity';
import { EquipmentImage } from './equipment-image.entity';
import { Rental } from './rental.entity';

@Entity({ name: 'equipment' })
export class Equipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Business, (b) => b.equipment, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ name: 'business_id', type: 'uniqueidentifier' })
  businessId: string;

  @Column({ name: 'title', type: 'nvarchar', length: 300 })
  title: string;

  @Column({ name: 'description', type: 'nvarchar', length: 2000, nullable: true })
  description: string | null;

  @Column({ name: 'daily_rate_cents', type: 'int' })
  dailyRateCents: number;

  @Column({ name: 'currency', type: 'char', length: 3, default: 'USD' })
  currency: string;

  @Column({
    name: 'listing_status',
    type: 'varchar',
    length: 32,
    default: EquipmentListingStatus.Draft,
  })
  listingStatus: EquipmentListingStatus;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime2', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => EquipmentImage, (i) => i.equipment)
  images: EquipmentImage[];

  @OneToMany(() => Rental, (r) => r.equipment)
  rentals: Rental[];
}
