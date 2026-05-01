import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { UsersService } from '../users/users.service';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(
    private readonly reviews: ReviewsService,
    private readonly users: UsersService,
  ) {}

  @Post()
  async create(
    @CurrentUser() jwt: JwtPayload,
    @Body() body: { rentalId: string; rating: number; comment?: string },
  ) {
    const user = await this.users.ensureFromJwt(jwt);
    return this.reviews.create(user.id, body.rentalId, body.rating, body.comment);
  }

  @Get('rental/:rentalId')
  async list(@Param('rentalId', ParseUUIDPipe) rentalId: string) {
    return this.reviews.listForRental(rentalId);
  }
}
