import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppRole } from '../common/enums';

export interface JwtPayload {
  /** Azure AD B2C subject */
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
    const tenant = config.get<string>('azureAdB2C.tenant', '');
    const policy = config.get<string>('azureAdB2C.policy', '');
    const clientId = config.get<string>('azureAdB2C.clientId', '');
    const configuredJwks = process.env.AZURE_AD_B2C_JWKS_URI;
    const jwksUri =
      configuredJwks?.trim() ||
      `https://${tenant}.b2clogin.com/${tenant}.onmicrosoft.com/${policy}/discovery/v2.0/keys`;

    const issuer = config.get<string>('azureAdB2C.issuer', '');

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
          roles.push(AppRole.PlatformAdmin);
      }
    }
    const adminSubs = (process.env.PLATFORM_ADMIN_SUBS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (adminSubs.includes(sub)) {
      roles.length = 0;
      roles.push(AppRole.PlatformAdmin);
    } else if (!roles.length) {
      roles.push(AppRole.BusinessUser);
    }
    return {
      sub,
      oid: payload.oid as string | undefined,
      emails: payload.emails as string[] | undefined,
      roles,
    };
  }
}
