import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '../../auth/jwt.strategy';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    if (!req.user) {
      throw new Error('CurrentUser used without authenticated request');
    }
    return req.user;
  },
);
