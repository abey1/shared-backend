import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessUserRole } from '../common/enums';
import { BusinessUser } from '../entities/business-user.entity';

const ROLE_RANK: Record<BusinessUserRole, number> = {
  [BusinessUserRole.Member]: 1,
  [BusinessUserRole.Manager]: 2,
  [BusinessUserRole.Admin]: 3,
  [BusinessUserRole.Owner]: 4,
};

@Injectable()
export class BusinessAccessService {
  constructor(
    @InjectRepository(BusinessUser)
    private readonly membershipRepo: Repository<BusinessUser>,
  ) {}

  async requireMembership(
    userId: string,
    businessId: string,
    minRole: BusinessUserRole = BusinessUserRole.Member,
  ): Promise<BusinessUser> {
    const row = await this.membershipRepo.findOne({
      where: { userId, businessId },
    });
    if (!row) {
      throw new ForbiddenException('Not a member of this business');
    }
    if (ROLE_RANK[row.role] < ROLE_RANK[minRole]) {
      throw new ForbiddenException('Insufficient business role');
    }
    return row;
  }

  async getMembershipOrThrow(
    userId: string,
    businessId: string,
  ): Promise<BusinessUser> {
    const row = await this.membershipRepo.findOne({
      where: { userId, businessId },
    });
    if (!row) {
      throw new NotFoundException('Membership not found');
    }
    return row;
  }

  async isMember(userId: string, businessId: string): Promise<boolean> {
    const row = await this.membershipRepo.findOne({
      where: { userId, businessId },
    });
    return !!row;
  }
}
