import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../auth/jwt.strategy';
import { User } from '../entities/user.entity';
import { UserIdentity } from '../entities/user-identity.entity';

/** Matches dbo.user_identities.provider for Entra External ID / B2C tokens. */
const EXTERNAL_ID_PROVIDER = 'azure_ad_b2c';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(UserIdentity)
    private readonly identities: Repository<UserIdentity>,
  ) {}

  async ensureFromJwt(payload: JwtPayload): Promise<User> {
    const oid = payload.oid ?? payload.sub;
    const existing = await this.users.findOne({
      where: { azureAdB2cOid: oid },
    });
    let user: User;
    if (existing) {
      user = existing;
    } else {
      const email =
        payload.emails?.[0]?.toLowerCase() ??
        `${oid.replace(/[^a-zA-Z0-9]/g, '')}@users.b2c.local`;
      const displayName = email.split('@')[0] ?? 'User';
      user = await this.users.save(
        this.users.create({
          azureAdB2cOid: oid,
          email,
          displayName,
        }),
      );
    }
    await this.syncExternalIdentity(user, oid, payload.emails?.[0]?.toLowerCase() ?? null);
    return user;
  }

  /**
   * Keeps dbo.user_identities in sync with schema2 for the primary Entra/B2C login.
   */
  private async syncExternalIdentity(
    user: User,
    providerUserId: string,
    providerEmail: string | null,
  ): Promise<void> {
    let row = await this.identities.findOne({
      where: {
        provider: EXTERNAL_ID_PROVIDER,
        providerUserId,
      },
    });
    if (!row) {
      await this.identities.save(
        this.identities.create({
          userId: user.id,
          provider: EXTERNAL_ID_PROVIDER,
          providerUserId,
          providerEmail,
        }),
      );
      return;
    }
    if (row.userId !== user.id) {
      return;
    }
    if (providerEmail && row.providerEmail !== providerEmail) {
      row.providerEmail = providerEmail;
      await this.identities.save(row);
    }
  }

  async findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  async findByIdWithIdentities(id: string): Promise<User | null> {
    return this.users.findOne({
      where: { id },
      relations: ['identities'],
    });
  }
}
