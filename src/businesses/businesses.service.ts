import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BusinessUserRole, VerificationStatus } from '../common/enums';
import { Business } from '../entities/business.entity';
import { BusinessUser } from '../entities/business-user.entity';
import { User } from '../entities/user.entity';
import type { CreateBusinessDto } from './dto';
import { BusinessAccessService } from './business-access.service';

function normalizeSubdomain(raw: string | undefined): string | null {
  const s = raw?.trim().toLowerCase();
  return s?.length ? s : null;
}

@Injectable()
export class BusinessesService {
  constructor(
    @InjectRepository(Business)
    private readonly businesses: Repository<Business>,
    @InjectRepository(BusinessUser)
    private readonly members: Repository<BusinessUser>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly access: BusinessAccessService,
  ) {}

  async createForUser(userId: string, dto: CreateBusinessDto): Promise<Business> {
    const subdomain = normalizeSubdomain(dto.subdomain);
    if (subdomain) {
      const taken = await this.businesses.exist({ where: { subdomain } });
      if (taken) {
        throw new ConflictException('Subdomain already in use');
      }
    }
    const name =
      dto.name?.trim() ||
      dto.legalName.trim();
    const b = this.businesses.create({
      legalName: dto.legalName,
      taxId: dto.taxId ?? null,
      verificationStatus: VerificationStatus.Pending,
      name,
      subdomain,
      ownerUserId: userId,
    });
    const saved = await this.businesses.save(b);
    const m = this.members.create({
      userId,
      businessId: saved.id,
      role: BusinessUserRole.Owner,
    });
    await this.members.save(m);
    return saved;
  }

  async listForUser(userId: string): Promise<Business[]> {
    const links = await this.members.find({ where: { userId } });
    const ids = links.map((l) => l.businessId);
    if (!ids.length) {
      return [];
    }
    return this.businesses.find({ where: { id: In(ids) } });
  }

  async getForMember(userId: string, businessId: string): Promise<Business> {
    await this.access.requireMembership(userId, businessId);
    const b = await this.businesses.findOne({ where: { id: businessId } });
    if (!b) {
      throw new NotFoundException('Business not found');
    }
    return b;
  }

  async addMember(
    actorUserId: string,
    businessId: string,
    targetUserId: string,
    role: BusinessUserRole,
  ): Promise<BusinessUser> {
    await this.access.requireMembership(actorUserId, businessId, BusinessUserRole.Admin);
    const exists = await this.members.findOne({
      where: { userId: targetUserId, businessId },
    });
    if (exists) {
      exists.role = role;
      return this.members.save(exists);
    }
    const row = this.members.create({
      userId: targetUserId,
      businessId,
      role,
    });
    return this.members.save(row);
  }
}
