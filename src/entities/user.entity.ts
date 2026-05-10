import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BusinessUser } from './business-user.entity';
import { UserIdentity } from './user-identity.entity';
import { EquipmentCondition } from './equipment-condition.entity';
import { Review } from './review.entity';
import { Dispute } from './dispute.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'email', type: 'nvarchar', length: 320 })
  email: string;

  @Column({ name: 'display_name', type: 'nvarchar', length: 200 })
  displayName: string;

  @Column({ name: 'azure_ad_b2c_oid', type: 'nvarchar', length: 64, nullable: true })
  azureAdB2cOid: string | null;

  @Column({ name: 'password_hash', type: 'nvarchar', length: 512, nullable: true })
  passwordHash: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime2', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => UserIdentity, (i) => i.user)
  identities: UserIdentity[];

  @OneToMany(() => BusinessUser, (m) => m.user)
  businessMemberships: BusinessUser[];

  @OneToMany(() => EquipmentCondition, (c) => c.inspector)
  inspections: EquipmentCondition[];

  @OneToMany(() => Review, (r) => r.reviewer)
  reviews: Review[];

  @OneToMany(() => Dispute, (d) => d.raisedBy)
  disputesRaised: Dispute[];

  @OneToMany(() => Dispute, (d) => d.resolvedBy)
  disputesResolved: Dispute[];
}
