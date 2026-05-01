import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../auth/jwt.strategy';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async ensureFromJwt(payload: JwtPayload): Promise<User> {
    const oid = payload.oid ?? payload.sub;
    const existing = await this.users.findOne({
      where: { azureAdB2cOid: oid },
    });
    if (existing) {
      return existing;
    }
    const email =
      payload.emails?.[0]?.toLowerCase() ?? `${oid.replace(/[^a-zA-Z0-9]/g, '')}@users.b2c.local`;
    const displayName = email.split('@')[0] ?? 'User';
    const row = this.users.create({
      azureAdB2cOid: oid,
      email,
      displayName,
    });
    return this.users.save(row);
  }

  async findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }
}
