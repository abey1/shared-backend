import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppRole } from '../common/enums';

export interface JwtPayload {
  /** Microsoft Entra External ID (CIAM) subject */
  sub: string;
  oid?: string;
  emails?: string[];
  /** Optional app registrations / claims */
  roles: AppRole[];
  /** Resolved internal user id after sync (attached by middleware later) */
  userId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'azure-b2c-jwt') {
  constructor(private readonly config: ConfigService) {
    const clientId = config.get<string>('azureAdB2C.clientId', '');
    const jwksUri = config.get<string>('azureAdB2C.jwksUri', '').trim();
    const issuer = config.get<string>('azureAdB2C.issuer', '').trim();

    const devSecret = config.get<string>('jwtDevSecret', '');
    const useDev = config.get<string>('env') === 'development' && !!devSecret;

    super(
      useDev
        ? {
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: devSecret,
            audience: clientId || undefined,
            issuer: issuer || undefined,
          }
        : {
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKeyProvider: passportJwtSecret({
              cache: true,
              rateLimit: true,
              jwksUri,
            }),
            audience: clientId,
            issuer,
            algorithms: ['RS256'],
          },
    );
  }

  validate(payload: Record<string, unknown>): JwtPayload {
    const sub = String(payload.sub ?? payload.oid ?? '');
    if (!sub) {
      throw new UnauthorizedException('Token missing subject');
    }
    const rawRoles = payload.roles ?? (payload as { extension_Roles?: string[] }).extension_Roles;
    const roles: AppRole[] = [];
    if (Array.isArray(rawRoles)) {
      for (const r of rawRoles) {
        if (r === AppRole.PlatformAdmin || r === 'platform_admin')
          this.pushDistinct(roles, AppRole.PlatformAdmin);
      }
    }

    const adminSubs = this.parseSubAllowlist('auth.platformAdminSubs');
    const ownerSubs = this.parseSubAllowlist('auth.platformBusinessOwnerSubs');
    const managerSubs = this.parseSubAllowlist('auth.platformBusinessManagerSubs');

    if (adminSubs.includes(sub)) {
      roles.length = 0;
      this.pushDistinct(roles, AppRole.PlatformAdmin);
    } else if (!roles.includes(AppRole.PlatformAdmin)) {
      if (ownerSubs.includes(sub)) {
        this.pushDistinct(roles, AppRole.BusinessOwner);
      }
      if (managerSubs.includes(sub)) {
        this.pushDistinct(roles, AppRole.BusinessManager);
      }
    }

    this.pushDistinct(roles, AppRole.BusinessUser);
    return {
      sub,
      oid: payload.oid as string | undefined,
      emails: payload.emails as string[] | undefined,
      roles,
    };
  }

  private parseSubAllowlist(configKey: string): string[] {
    return (this.config.get<string>(configKey) ?? '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
  }

  private pushDistinct(roles: AppRole[], role: AppRole): void {
    if (!roles.includes(role)) {
      roles.push(role);
    }
  }
}
