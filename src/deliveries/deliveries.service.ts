import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessUserRole, DeliveryStatus } from '../common/enums';
import { BusinessAccessService } from '../businesses/business-access.service';
import { Delivery } from '../entities/delivery.entity';
import { Rental } from '../entities/rental.entity';
import { BlobStorageService } from '../infra/blob-storage.service';

@Injectable()
export class DeliveriesService {
  constructor(
    @InjectRepository(Delivery)
    private readonly deliveries: Repository<Delivery>,
    @InjectRepository(Rental)
    private readonly rentals: Repository<Rental>,
    private readonly access: BusinessAccessService,
    private readonly blobs: BlobStorageService,
  ) {}

  async getForRental(actorUserId: string, rentalId: string): Promise<Delivery[]> {
    const rental = await this.rentals.findOne({ where: { id: rentalId } });
    if (!rental) {
      throw new NotFoundException('Rental not found');
    }
    const ok =
      (await this.access.isMember(actorUserId, rental.renterBusinessId)) ||
      (await this.access.isMember(actorUserId, rental.supplierBusinessId));
    if (!ok) {
      throw new NotFoundException('Rental not found');
    }
    return this.deliveries.find({ where: { rentalId } });
  }

  async updateStatus(
    actorUserId: string,
    deliveryId: string,
    status: DeliveryStatus,
  ): Promise<Delivery> {
    const d = await this.deliveries.findOne({
      where: { id: deliveryId },
      relations: { rental: true },
    });
    if (!d) {
      throw new NotFoundException('Delivery not found');
    }
    await this.access.requireMembership(
      actorUserId,
      d.rental.supplierBusinessId,
      BusinessUserRole.Member,
    );
    d.status = status;
    if (status === DeliveryStatus.Delivered) {
      d.deliveredAt = new Date();
    }
    return this.deliveries.save(d);
  }

  async proofUploadSas(actorUserId: string, deliveryId: string, ext: string) {
    const d = await this.deliveries.findOne({
      where: { id: deliveryId },
      relations: { rental: true },
    });
    if (!d) {
      throw new NotFoundException('Delivery not found');
    }
    await this.access.requireMembership(
      actorUserId,
      d.rental.supplierBusinessId,
      BusinessUserRole.Member,
    );
    return this.blobs.createUploadSas('deliveries', ext);
  }

  async attachProof(actorUserId: string, deliveryId: string, blobPath: string) {
    const d = await this.deliveries.findOne({
      where: { id: deliveryId },
      relations: { rental: true },
    });
    if (!d) {
      throw new NotFoundException('Delivery not found');
    }
    await this.access.requireMembership(
      actorUserId,
      d.rental.supplierBusinessId,
      BusinessUserRole.Member,
    );
    d.proofBlobPath = blobPath;
    return this.deliveries.save(d);
  }
}
