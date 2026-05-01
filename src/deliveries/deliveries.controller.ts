import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { DeliveryStatus } from '../common/enums';
import { UsersService } from '../users/users.service';
import { DeliveriesService } from './deliveries.service';

@Controller('deliveries')
@UseGuards(JwtAuthGuard)
export class DeliveriesController {
  constructor(
    private readonly deliveries: DeliveriesService,
    private readonly users: UsersService,
  ) {}

  @Get('rental/:rentalId')
  async listForRental(
    @CurrentUser() jwt: JwtPayload,
    @Param('rentalId', ParseUUIDPipe) rentalId: string,
  ) {
    const user = await this.users.ensureFromJwt(jwt);
    return this.deliveries.getForRental(user.id, rentalId);
  }

  @Patch(':id/status')
  async status(
    @CurrentUser() jwt: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: DeliveryStatus },
  ) {
    const user = await this.users.ensureFromJwt(jwt);
    return this.deliveries.updateStatus(user.id, id, body.status);
  }

  @Post(':id/proof/sas')
  async proofSas(
    @CurrentUser() jwt: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { extension: string },
  ) {
    const user = await this.users.ensureFromJwt(jwt);
    return this.deliveries.proofUploadSas(user.id, id, body.extension);
  }

  @Post(':id/proof')
  async proof(
    @CurrentUser() jwt: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { blobPath: string },
  ) {
    const user = await this.users.ensureFromJwt(jwt);
    return this.deliveries.attachProof(user.id, id, body.blobPath);
  }
}
