import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { AppRole, DisputeStatus } from '../common/enums';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UsersService } from '../users/users.service';
import { DisputesService } from './disputes.service';

@Controller('disputes')
@UseGuards(JwtAuthGuard)
export class DisputesController {
  constructor(
    private readonly disputes: DisputesService,
    private readonly users: UsersService,
  ) {}

  @Post()
  async create(
    @CurrentUser() jwt: JwtPayload,
    @Body() body: { rentalId: string; subject: string; description: string },
  ) {
    const user = await this.users.ensureFromJwt(jwt);
    return this.disputes.create(
      user.id,
      body.rentalId,
      body.subject,
      body.description,
    );
  }

  @Post(':id/evidence/sas')
  async evidenceSas(
    @CurrentUser() jwt: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { extension: string },
  ) {
    const user = await this.users.ensureFromJwt(jwt);
    return this.disputes.evidenceSas(user.id, id, body.extension);
  }

  @Post(':id/evidence')
  async evidence(
    @CurrentUser() jwt: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { blobPath: string; description?: string },
  ) {
    const user = await this.users.ensureFromJwt(jwt);
    return this.disputes.addEvidence(user.id, id, body.blobPath, body.description);
  }

  @Post(':id/resolve')
  @UseGuards(RolesGuard)
  @Roles(AppRole.PlatformAdmin)
  async resolve(
    @CurrentUser() jwt: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      status: DisputeStatus.Resolved | DisputeStatus.Rejected;
      resolutionNotes: string;
    },
  ) {
    const user = await this.users.ensureFromJwt(jwt);
    return this.disputes.resolve(
      jwt,
      id,
      body.status,
      body.resolutionNotes,
      user.id,
    );
  }
}
