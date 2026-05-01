import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BusinessUserRole,
  EquipmentListingStatus,
} from '../common/enums';
import { BusinessAccessService } from '../businesses/business-access.service';
import { Equipment } from '../entities/equipment.entity';
import { EquipmentImage } from '../entities/equipment-image.entity';
import { BlobStorageService } from '../infra/blob-storage.service';
import type { CreateEquipmentDto, UpdateEquipmentDto } from './dto';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,
    @InjectRepository(EquipmentImage)
    private readonly images: Repository<EquipmentImage>,
    private readonly access: BusinessAccessService,
    private readonly blobs: BlobStorageService,
  ) {}

  async create(actorUserId: string, dto: CreateEquipmentDto): Promise<Equipment> {
    await this.access.requireMembership(
      actorUserId,
      dto.businessId,
      BusinessUserRole.Manager,
    );
    const e = this.equipmentRepo.create({
      businessId: dto.businessId,
      title: dto.title,
      description: dto.description ?? null,
      dailyRateCents: dto.dailyRateCents,
      currency: dto.currency ?? 'USD',
      listingStatus: EquipmentListingStatus.Draft,
    });
    return this.equipmentRepo.save(e);
  }

  async getPublic(id: string): Promise<Equipment> {
    const e = await this.equipmentRepo.findOne({
      where: { id },
      relations: { images: true, business: true },
    });
    if (!e) {
      throw new NotFoundException('Equipment not found');
    }
    return e;
  }

  async update(
    actorUserId: string,
    id: string,
    dto: UpdateEquipmentDto,
  ): Promise<Equipment> {
    const e = await this.equipmentRepo.findOne({ where: { id } });
    if (!e) {
      throw new NotFoundException('Equipment not found');
    }
    await this.access.requireMembership(
      actorUserId,
      e.businessId,
      BusinessUserRole.Manager,
    );
    if (dto.title !== undefined) e.title = dto.title;
    if (dto.description !== undefined) e.description = dto.description;
    if (dto.dailyRateCents !== undefined) e.dailyRateCents = dto.dailyRateCents;
    if (dto.listingStatus !== undefined) e.listingStatus = dto.listingStatus;
    return this.equipmentRepo.save(e);
  }

  async softDelete(actorUserId: string, id: string): Promise<void> {
    const e = await this.equipmentRepo.findOne({ where: { id } });
    if (!e) {
      throw new NotFoundException('Equipment not found');
    }
    await this.access.requireMembership(
      actorUserId,
      e.businessId,
      BusinessUserRole.Admin,
    );
    await this.equipmentRepo.softRemove(e);
  }

  async createImageUploadSas(
    actorUserId: string,
    equipmentId: string,
    extension: string,
    minRole: BusinessUserRole,
  ): Promise<{ uploadUrl: string; blobPath: string }> {
    const e = await this.equipmentRepo.findOne({ where: { id: equipmentId } });
    if (!e) {
      throw new NotFoundException('Equipment not found');
    }
    await this.access.requireMembership(actorUserId, e.businessId, minRole);
    return this.blobs.createUploadSas('equipment', extension);
  }

  async registerImage(
    actorUserId: string,
    equipmentId: string,
    blobPath: string,
    sortOrder: number,
    minRole: BusinessUserRole,
  ): Promise<EquipmentImage> {
    const e = await this.equipmentRepo.findOne({ where: { id: equipmentId } });
    if (!e) {
      throw new NotFoundException('Equipment not found');
    }
    await this.access.requireMembership(actorUserId, e.businessId, minRole);
    const img = this.images.create({
      equipmentId: e.id,
      blobPath,
      sortOrder,
    });
    return this.images.save(img);
  }
}
