import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppRole, DisputeStatus, RentalStatus } from '../common/enums';
import { BusinessAccessService } from '../businesses/business-access.service';
import type { JwtPayload } from '../auth/jwt.strategy';
import { Dispute } from '../entities/dispute.entity';
import { DisputeEvidence } from '../entities/dispute-evidence.entity';
import { Rental } from '../entities/rental.entity';
import { BlobStorageService } from '../infra/blob-storage.service';

@Injectable()
export class DisputesService {
  constructor(
    @InjectRepository(Dispute)
    private readonly disputes: Repository<Dispute>,
    @InjectRepository(DisputeEvidence)
    private readonly evidence: Repository<DisputeEvidence>,
    @InjectRepository(Rental)
    private readonly rentals: Repository<Rental>,
    private readonly access: BusinessAccessService,
    private readonly blobs: BlobStorageService,
  ) {}

  async create(
    userId: string,
    rentalId: string,
    subject: string,
    description: string,
  ): Promise<Dispute> {
    const rental = await this.rentals.findOne({ where: { id: rentalId } });
    if (!rental) {
      throw new NotFoundException('Rental not found');
    }
    const participant =
      (await this.access.isMember(userId, rental.renterBusinessId)) ||
      (await this.access.isMember(userId, rental.supplierBusinessId));
    if (!participant) {
      throw new NotFoundException('Rental not found');
    }
    if (rental.status === RentalStatus.Pending) {
      throw new NotFoundException('Cannot dispute a pending rental');
    }
    const d = this.disputes.create({
      rentalId,
      raisedByUserId: userId,
      subject,
      description,
      status: DisputeStatus.Open,
    });
    return this.disputes.save(d);
  }

  async evidenceSas(userId: string, disputeId: string, ext: string) {
    const d = await this.disputes.findOne({ where: { id: disputeId } });
    if (!d) {
      throw new NotFoundException('Dispute not found');
    }
    if (d.raisedByUserId !== userId) {
      throw new NotFoundException('Dispute not found');
    }
    return this.blobs.createUploadSas('disputes', ext);
  }

  async addEvidence(
    userId: string,
    disputeId: string,
    blobPath: string,
    description?: string,
  ): Promise<DisputeEvidence> {
    const d = await this.disputes.findOne({ where: { id: disputeId } });
    if (!d) {
      throw new NotFoundException('Dispute not found');
    }
    if (d.raisedByUserId !== userId) {
      throw new NotFoundException('Dispute not found');
    }
    const row = this.evidence.create({
      disputeId,
      blobPath,
      description: description ?? null,
    });
    return this.evidence.save(row);
  }

  async resolve(
    jwt: JwtPayload,
    disputeId: string,
    status: DisputeStatus.Resolved | DisputeStatus.Rejected,
    resolutionNotes: string,
    resolverUserId: string,
  ): Promise<Dispute> {
    if (!jwt.roles.includes(AppRole.PlatformAdmin)) {
      throw new ForbiddenException('Admin only');
    }
    const d = await this.disputes.findOne({ where: { id: disputeId } });
    if (!d) {
      throw new NotFoundException('Dispute not found');
    }
    d.status = status;
    d.resolutionNotes = resolutionNotes;
    d.resolvedByUserId = resolverUserId;
    d.resolvedAt = new Date();
    return this.disputes.save(d);
  }
}
