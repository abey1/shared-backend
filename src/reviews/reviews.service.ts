import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RentalStatus } from '../common/enums';
import { BusinessAccessService } from '../businesses/business-access.service';
import { Review } from '../entities/review.entity';
import { Rental } from '../entities/rental.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
    @InjectRepository(Rental)
    private readonly rentals: Repository<Rental>,
    private readonly access: BusinessAccessService,
  ) {}

  async create(
    userId: string,
    rentalId: string,
    rating: number,
    comment?: string,
  ): Promise<Review> {
    const rental = await this.rentals.findOne({ where: { id: rentalId } });
    if (!rental) {
      throw new NotFoundException('Rental not found');
    }
    if (rental.status !== RentalStatus.Completed) {
      throw new ConflictException('Reviews allowed only for completed rentals');
    }
    await this.access.requireMembership(userId, rental.renterBusinessId);
    const existing = await this.reviews.findOne({
      where: { rentalId, reviewerUserId: userId },
    });
    if (existing) {
      existing.rating = rating;
      existing.comment = comment ?? null;
      return this.reviews.save(existing);
    }
    const row = this.reviews.create({
      rentalId,
      reviewerUserId: userId,
      rating,
      comment: comment ?? null,
    });
    return this.reviews.save(row);
  }

  async listForRental(rentalId: string): Promise<Review[]> {
    return this.reviews.find({ where: { rentalId } });
  }
}
