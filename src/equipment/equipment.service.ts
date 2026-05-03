import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import {
  BusinessUserRole,
  EquipmentListingStatus,
} from '../common/enums';
import { BusinessAccessService } from '../businesses/business-access.service';
import { Equipment } from '../entities/equipment.entity';
import { EquipmentImage } from '../entities/equipment-image.entity';
import { BlobStorageService } from '../infra/blob-storage.service';
import type {
  CreateEquipmentDto,
  ListEquipmentQueryDto,
  UpdateEquipmentDto,
} from './dto';

export interface EquipmentListItem {
  id: string;
  title: string;
  description: string | null;
  dailyRateCents: number;
  currency: string;
  listingStatus: EquipmentListingStatus;
  images: { id: string; blobPath: string; sortOrder: number }[];
  business: { id: string; legalName: string };
}

export interface EquipmentListResult {
  data: EquipmentListItem[];
  page: number;
  limit: number;
  total: number;
}

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

  async findAll(query: ListEquipmentQueryDto): Promise<EquipmentListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where: FindOptionsWhere<Equipment> = {
      listingStatus: EquipmentListingStatus.Active,
    };
    if (query.businessId) {
      where.businessId = query.businessId;
    }
    const { minPrice, maxPrice } = query;
    if (minPrice !== undefined && maxPrice !== undefined) {
      where.dailyRateCents = Between(minPrice, maxPrice);
    } else if (minPrice !== undefined) {
      where.dailyRateCents = MoreThanOrEqual(minPrice);
    } else if (maxPrice !== undefined) {
      where.dailyRateCents = LessThanOrEqual(maxPrice);
    }

    const [rows, total] = await this.equipmentRepo.findAndCount({
      where,
      relations: { images: true, business: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data: EquipmentListItem[] = rows.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      dailyRateCents: e.dailyRateCents,
      currency: e.currency,
      listingStatus: e.listingStatus,
      images: [...(e.images ?? [])]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((i) => ({
          id: i.id,
          blobPath: i.blobPath,
          sortOrder: i.sortOrder,
        })),
      business: {
        id: e.business.id,
        legalName: e.business.legalName,
      },
    }));

    return { data, page, limit, total };
  }

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
