import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  async me(@CurrentUser() jwt: JwtPayload) {
    const user = await this.users.ensureFromJwt(jwt);
    const full = await this.users.findByIdWithIdentities(user.id);
    const identities = full?.identities ?? [];
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      identities: identities.map((i) => ({
        id: i.id,
        provider: i.provider,
        providerUserId: i.providerUserId,
        providerEmail: i.providerEmail,
        createdAt: i.createdAt,
      })),
    };
  }
}
