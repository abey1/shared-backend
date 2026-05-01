import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import {
  BusinessUserRole,
} from '../common/enums';
import { BusinessAccessService } from '../businesses/business-access.service';
import { UsersService } from '../users/users.service';
import { RentalsService } from '../rentals/rentals.service';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly users: UsersService,
    private readonly access: BusinessAccessService,
    private readonly rentals: RentalsService,
  ) {}

  @Post('rentals/:rentalId/intents')
  async createIntents(
    @CurrentUser() jwt: JwtPayload,
    @Param('rentalId', ParseUUIDPipe) rentalId: string,
    @Body() body: { depositAmountCents?: number },
  ) {
    const user = await this.users.ensureFromJwt(jwt);
    return this.payments.createIntentsForRental(
      user.id,
      rentalId,
      body.depositAmountCents,
    );
  }

  /** Release uncaptured charges after rental completion (happy path). */
  @Post('rentals/:rentalId/settle')
  async settle(
    @CurrentUser() jwt: JwtPayload,
    @Param('rentalId', ParseUUIDPipe) rentalId: string,
  ) {
    const user = await this.users.ensureFromJwt(jwt);
    const rental = await this.rentals.getForParticipant(user.id, rentalId);
    await this.access.requireMembership(
      user.id,
      rental.supplierBusinessId,
      BusinessUserRole.Manager,
    );
    await this.payments.settleAfterCompletion(rentalId);
    return { ok: true };
  }
}
