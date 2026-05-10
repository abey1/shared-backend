import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'user_identities' })
@Unique(['provider', 'providerUserId'])
export class UserIdentity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.identities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uniqueidentifier' })
  userId: string;

  @Column({ name: 'provider', type: 'varchar', length: 50 })
  provider: string;

  @Column({ name: 'provider_user_id', type: 'varchar', length: 255 })
  providerUserId: string;

  @Column({ name: 'provider_email', type: 'varchar', length: 255, nullable: true })
  providerEmail: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;
}
