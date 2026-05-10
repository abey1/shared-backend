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
import { VerificationStatus } from '../common/enums';
import { User } from './user.entity';
import { BusinessUser } from './business-user.entity';
import { Equipment } from './equipment.entity';
import { Rental } from './rental.entity';

@Entity({ name: 'businesses' })
export class Business {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'legal_name', type: 'nvarchar', length: 300 })
  legalName: string;

  /** Optional display name (schema2); falls back to legalName in API when unset. */
  @Column({ name: 'name', type: 'nvarchar', length: 255, nullable: true })
  name: string | null;

  /** Tenant subdomain; unique when set (schema2 UQ_businesses_subdomain). */
  @Column({ name: 'subdomain', type: 'nvarchar', length: 255, nullable: true })
  subdomain: string | null;

  @Column({ name: 'tax_id', type: 'nvarchar', length: 64, nullable: true })
  taxId: string | null;

  @Column({
    name: 'verification_status',
    type: 'varchar',
    length: 32,
    default: VerificationStatus.Pending,
  })
  verificationStatus: VerificationStatus;

  @Column({
    name: 'stripe_connect_account_id',
    type: 'nvarchar',
    length: 64,
    nullable: true,
  })
  stripeConnectAccountId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime2', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'owner_user_id', type: 'uniqueidentifier', nullable: true })
  ownerUserId: string | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'owner_user_id' })
  owner: User | null;

  @OneToMany(() => BusinessUser, (m) => m.business)
  members: BusinessUser[];

  @OneToMany(() => Equipment, (e) => e.business)
  equipment: Equipment[];

  @OneToMany(() => Rental, (r) => r.renterBusiness)
  rentalsAsRenter: Rental[];

  @OneToMany(() => Rental, (r) => r.supplierBusiness)
  rentalsAsSupplier: Rental[];
}
