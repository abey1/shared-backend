import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessUserRole, ConditionPhase, RentalStatus } from '../common/enums';
import { BusinessAccessService } from '../businesses/business-access.service';
import { ConditionImage } from '../entities/condition-image.entity';
import { EquipmentCondition } from '../entities/equipment-condition.entity';
import { Rental } from '../entities/rental.entity';
import { BlobStorageService } from '../infra/blob-storage.service';
import type { UpsertConditionDto } from './dto';

@Injectable()
export class RentalConditionsService {
  constructor(
    @InjectRepository(EquipmentCondition)
    private readonly cond: Repository<EquipmentCondition>,
    @InjectRepository(ConditionImage)
    private readonly images: Repository<ConditionImage>,
    @InjectRepository(Rental)
    private readonly rentals: Repository<Rental>,
    private readonly access: BusinessAccessService,
    private readonly blobs: BlobStorageService,
  ) {}

  private async assertRentalParticipant(
    userId: string,
    rental: Rental,
    minRole: BusinessUserRole,
  ): Promise<void> {
    const renter = await this.access.isMember(userId, rental.renterBusinessId);
    const supplier = await this.access.isMember(userId, rental.supplierBusinessId);
    if (renter) {
      await this.access.requireMembership(userId, rental.renterBusinessId, minRole);
      return;
    }
    if (supplier) {
      await this.access.requireMembership(userId, rental.supplierBusinessId, minRole);
      return;
    }
    throw new NotFoundException('Rental not found');
  }

  async upsert(
    userId: string,
    dto: UpsertConditionDto & { rentalId: string },
  ): Promise<EquipmentCondition> {
    const rental = await this.rentals.findOne({ where: { id: dto.rentalId } });
    if (!rental) {
      throw new NotFoundException('Rental not found');
    }
    if (
      rental.status !== RentalStatus.Confirmed &&
      rental.status !== RentalStatus.Active &&
      rental.status !== RentalStatus.Completed
    ) {
      throw new ConflictException('Rental not in a state for inspections');
    }
    await this.assertRentalParticipant(userId, rental, BusinessUserRole.Member);
    let row = await this.cond.findOne({
      where: { rentalId: dto.rentalId, phase: dto.phase },
    });
    if (!row) {
      row = this.cond.create({
        rentalId: dto.rentalId,
        phase: dto.phase,
        notes: dto.notes ?? null,
        inspectorUserId: userId,
      });
    } else {
      if (dto.notes !== undefined) row.notes = dto.notes;
      row.inspectorUserId = userId;
    }
    return this.cond.save(row);
  }

  async sasForConditionImage(
    userId: string,
    rentalId: string,
    phaseRaw: string,
    extension: string,
    minRole: BusinessUserRole,
  ): Promise<{ uploadUrl: string; blobPath: string }> {
    const phase = phaseRaw as ConditionPhase;
    const rental = await this.rentals.findOne({ where: { id: rentalId } });
    if (!rental) {
      throw new NotFoundException('Rental not found');
    }
    await this.assertRentalParticipant(userId, rental, minRole);
    await this.ensureConditionRow(rentalId, phase, userId);
    return this.blobs.createUploadSas('conditions', extension);
  }

  async addConditionImage(
    userId: string,
    rentalId: string,
    phaseRaw: string,
    blobPath: string,
  ): Promise<ConditionImage> {
    const phase = phaseRaw as ConditionPhase;
    const rental = await this.rentals.findOne({ where: { id: rentalId } });
    if (!rental) {
      throw new NotFoundException('Rental not found');
    }
    await this.assertRentalParticipant(userId, rental, BusinessUserRole.Member);
    const ec = await this.ensureConditionRow(rentalId, phase, userId);
    const img = this.images.create({
      conditionId: ec.id,
      blobPath,
    });
    return this.images.save(img);
  }

  private async ensureConditionRow(
    rentalId: string,
    phase: ConditionPhase,
    userId: string,
  ): Promise<EquipmentCondition> {
    let row = await this.cond.findOne({ where: { rentalId, phase } });
    if (!row) {
      row = this.cond.create({
        rentalId,
        phase,
        inspectorUserId: userId,
      });
      row = await this.cond.save(row);
    }
    return row;
  }
}
