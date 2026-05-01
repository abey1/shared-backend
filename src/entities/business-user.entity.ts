import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { BusinessUserRole } from '../common/enums';
import { User } from './user.entity';
import { Business } from './business.entity';

@Entity({ name: 'business_users' })
@Unique(['userId', 'businessId'])
export class BusinessUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.businessMemberships, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uniqueidentifier' })
  userId: string;

  @ManyToOne(() => Business, (b) => b.members, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ name: 'business_id', type: 'uniqueidentifier' })
  businessId: string;

  @Column({ name: 'role', type: 'varchar', length: 32 })
  role: BusinessUserRole;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;
}
