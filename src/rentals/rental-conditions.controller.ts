import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { BusinessUserRole } from '../common/enums';
import { UsersService } from '../users/users.service';
import { UpsertConditionDto } from './dto';
import { RentalConditionsService } from './rental-conditions.service';

@Controller('rentals')
@UseGuards(JwtAuthGuard)
export class RentalConditionsController {
  constructor(
    private readonly conditions: RentalConditionsService,
    private readonly users: UsersService,
  ) {}

  @Post(':rentalId/conditions')
  async upsert(
    @CurrentUser() jwt: JwtPayload,
    @Param('rentalId', ParseUUIDPipe) rentalId: string,
    @Body() dto: UpsertConditionDto,
  ) {
    const user = await this.users.ensureFromJwt(jwt);
    return this.conditions.upsert(user.id, { ...dto, rentalId });
  }

  @Post(':rentalId/conditions/images/sas')
  async sas(
    @CurrentUser() jwt: JwtPayload,
    @Param('rentalId', ParseUUIDPipe) rentalId: string,
    @Body() body: { phase: string; extension: string },
  ) {
    const user = await this.users.ensureFromJwt(jwt);
    return this.conditions.sasForConditionImage(
      user.id,
      rentalId,
      body.phase,
      body.extension,
      BusinessUserRole.Member,
    );
  }

  @Post(':rentalId/conditions/images')
  async registerImage(
    @CurrentUser() jwt: JwtPayload,
    @Param('rentalId', ParseUUIDPipe) rentalId: string,
    @Body() body: { phase: string; blobPath: string },
  ) {
    const user = await this.users.ensureFromJwt(jwt);
    return this.conditions.addConditionImage(
      user.id,
      rentalId,
      body.phase,
      body.blobPath,
    );
  }
}
