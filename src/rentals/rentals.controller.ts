import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { AppRole } from '../common/enums';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UsersService } from '../users/users.service';
import { CreateRentalDto } from './dto';
import { RentalsService } from './rentals.service';

@Controller('rentals')
@UseGuards(JwtAuthGuard)
export class RentalsController {
  constructor(
    private readonly rentals: RentalsService,
    private readonly users: UsersService,
  ) {}

  @Post()
  async create(@CurrentUser() jwt: JwtPayload, @Body() dto: CreateRentalDto) {
    const user = await this.users.ensureFromJwt(jwt);
    return this.rentals.create(user.id, dto);
  }

  @Get(':id')
  async get(
    @CurrentUser() jwt: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const user = await this.users.ensureFromJwt(jwt);
    return this.rentals.getForParticipant(user.id, id);
  }

  @Post(':id/complete')
  async complete(
    @CurrentUser() jwt: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const user = await this.users.ensureFromJwt(jwt);
    return this.rentals.complete(user.id, id);
  }

  @Post(':id/cancel')
  async cancel(
    @CurrentUser() jwt: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason: string; side: 'renter' | 'supplier' },
  ) {
    const user = await this.users.ensureFromJwt(jwt);
    return this.rentals.cancel(user.id, id, body.reason, body.side);
  }

  @Post(':id/activate')
  @UseGuards(RolesGuard)
  @Roles(AppRole.PlatformAdmin)
  async activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.rentals.startActive(id);
  }
}
