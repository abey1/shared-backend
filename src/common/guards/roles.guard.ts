import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AppRole } from '../enums';
import type { JwtPayload } from '../../auth/jwt.strategy';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) {
      return true;
    }
    const req = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const roles = req.user?.roles ?? [];
    const ok = required.some((r) => roles.includes(r));
    if (!ok) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
