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
import { Rental } from './rental.entity';
import { User } from './user.entity';

@Entity({ name: 'reviews' })
@Unique(['rentalId', 'reviewerUserId'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Rental, (r) => r.reviews, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'rental_id' })
  rental: Rental;

  @Column({ name: 'rental_id', type: 'uniqueidentifier' })
  rentalId: string;

  @ManyToOne(() => User, (u) => u.reviews, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'reviewer_user_id' })
  reviewer: User;

  @Column({ name: 'reviewer_user_id', type: 'uniqueidentifier' })
  reviewerUserId: string;

  @Column({ name: 'rating', type: 'tinyint' })
  rating: number;

  @Column({ name: 'comment', type: 'nvarchar', length: 2000, nullable: true })
  comment: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;
}
