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
  /** Primary mailbox-style address extracted from common access-token claim shapes */
  primaryEmail?: string | null;
  /** Display name from token claims when the API emits them (optional claims) */
  displayName?: string | null;
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
    const primaryEmail = this.extractPrimaryEmail(payload);
    const displayName = this.extractDisplayName(payload);
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
    const emailsClaim = payload.emails as string[] | undefined;
    const normalizedEmails =
      emailsClaim ??
      (primaryEmail ? [primaryEmail] : undefined);
    return {
      sub,
      oid: payload.oid as string | undefined,
      emails: normalizedEmails,
      primaryEmail,
      displayName,
      roles,
    };
  }

  private extractPrimaryEmail(payload: Record<string, unknown>): string | null {
    const emails = payload.emails;
    if (Array.isArray(emails)) {
      for (const e of emails) {
        if (typeof e === 'string' && e.includes('@')) {
          return e.trim().toLowerCase();
        }
      }
    }
    if (typeof payload.email === 'string' && payload.email.includes('@')) {
      return payload.email.trim().toLowerCase();
    }
    for (const key of Object.keys(payload)) {
      if (key.toLowerCase().includes('emailaddress') && key.includes('claims/')) {
        const v = payload[key];
        if (typeof v === 'string' && v.includes('@')) return v.trim().toLowerCase();
        if (Array.isArray(v) && typeof v[0] === 'string' && v[0].includes('@')) {
          return v[0].trim().toLowerCase();
        }
      }
    }
    const preferred = payload.preferred_username;
    if (typeof preferred === 'string' && preferred.includes('@')) {
      return preferred.trim().toLowerCase();
    }
    const upn = payload.upn;
    if (typeof upn === 'string' && upn.includes('@')) {
      return upn.trim().toLowerCase();
    }
    return null;
  }

  private extractDisplayName(payload: Record<string, unknown>): string | null {
    if (typeof payload.name === 'string' && payload.name.trim()) {
      return payload.name.trim();
    }
    const given = payload.given_name;
    const family = payload.family_name;
    if (typeof given === 'string' || typeof family === 'string') {
      const merged = [given, family]
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .map((s) => s.trim())
        .join(' ')
        .trim();
      if (merged) return merged;
    }
    return null;
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
