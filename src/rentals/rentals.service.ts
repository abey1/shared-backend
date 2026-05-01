import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BusinessUserRole,
  DeliveryStatus,
  EquipmentListingStatus,
  RentalStatus,
  VerificationStatus,
} from '../common/enums';
import { BusinessAccessService } from '../businesses/business-access.service';
import { Equipment } from '../entities/equipment.entity';
import { Rental } from '../entities/rental.entity';
import { Delivery } from '../entities/delivery.entity';
import { ServiceBusPublisher } from '../infra/service-bus.publisher';
import type { CreateRentalDto } from './dto';

function rentalDays(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / 86_400_000));
}

@Injectable()
export class RentalsService {
  constructor(
    @InjectRepository(Rental)
    private readonly rentals: Repository<Rental>,
    @InjectRepository(Equipment)
    private readonly equipment: Repository<Equipment>,
    @InjectRepository(Delivery)
    private readonly deliveries: Repository<Delivery>,
    private readonly access: BusinessAccessService,
    private readonly bus: ServiceBusPublisher,
  ) {}

  async create(actorUserId: string, dto: CreateRentalDto): Promise<Rental> {
    await this.access.requireMembership(
      actorUserId,
      dto.renterBusinessId,
      BusinessUserRole.Member,
    );
    const equip = await this.equipment.findOne({
      where: { id: dto.equipmentId },
      relations: { business: true },
    });
    if (!equip) {
      throw new NotFoundException('Equipment not found');
    }
    if (equip.listingStatus !== EquipmentListingStatus.Active) {
      throw new BadRequestException('Equipment is not available for rent');
    }
    if (equip.business.verificationStatus !== VerificationStatus.Verified) {
      throw new BadRequestException('Supplier business is not verified');
    }
    if (equip.businessId === dto.renterBusinessId) {
      throw new BadRequestException('Cannot rent your own equipment');
    }
    const days = rentalDays(dto.startAt, dto.endAt);
    const total = days * equip.dailyRateCents;
    const r = this.rentals.create({
      equipmentId: equip.id,
      renterBusinessId: dto.renterBusinessId,
      supplierBusinessId: equip.businessId,
      startAt: dto.startAt,
      endAt: dto.endAt,
      status: RentalStatus.Pending,
      totalAmountCents: total,
      currency: equip.currency,
    });
    const saved = await this.rentals.save(r);
    await this.bus.publishRentalEvent({
      type: 'rental.created',
      rentalId: saved.id,
      renterBusinessId: saved.renterBusinessId,
    });
    return saved;
  }

  async getForParticipant(actorUserId: string, rentalId: string): Promise<Rental> {
    const row = await this.rentals.findOne({
      where: { id: rentalId },
      relations: {
        equipment: true,
        renterBusiness: true,
        supplierBusiness: true,
        payments: true,
        deposits: true,
        deliveries: true,
      },
    });
    if (!row) {
      throw new NotFoundException('Rental not found');
    }
    const renterOk = await this.access.isMember(actorUserId, row.renterBusinessId);
    const supplierOk = await this.access.isMember(actorUserId, row.supplierBusinessId);
    if (!renterOk && !supplierOk) {
      throw new ForbiddenException('Not authorized for this rental');
    }
    return row;
  }

  /** Called when primary payment succeeds (e.g. Stripe webhook). */
  async markConfirmed(rentalId: string): Promise<Rental> {
    const row = await this.rentals.findOne({ where: { id: rentalId } });
    if (!row) {
      throw new NotFoundException('Rental not found');
    }
    if (row.status !== RentalStatus.Pending) {
      throw new ConflictException('Rental is not pending confirmation');
    }
    row.status = RentalStatus.Confirmed;
    const saved = await this.rentals.save(row);
    await this.bus.publishRentalEvent({ type: 'rental.confirmed', rentalId });
    return saved;
  }

  async startActive(rentalId: string): Promise<Rental> {
    const row = await this.rentals.findOne({ where: { id: rentalId } });
    if (!row) {
      throw new NotFoundException('Rental not found');
    }
    if (row.status !== RentalStatus.Confirmed) {
      throw new ConflictException('Rental must be confirmed before activation');
    }
    row.status = RentalStatus.Active;
    return this.rentals.save(row);
  }

  async complete(actorUserId: string, rentalId: string): Promise<Rental> {
    const row = await this.getForParticipant(actorUserId, rentalId);
    await this.access.requireMembership(
      actorUserId,
      row.supplierBusinessId,
      BusinessUserRole.Manager,
    );
    if (row.status !== RentalStatus.Active) {
      throw new ConflictException('Only active rentals can complete');
    }
    row.status = RentalStatus.Completed;
    const saved = await this.rentals.save(row);
    await this.bus.publishRentalEvent({ type: 'rental.completed', rentalId });
    return saved;
  }

  async cancel(
    actorUserId: string,
    rentalId: string,
    reason: string,
    side: 'renter' | 'supplier',
  ): Promise<Rental> {
    const row = await this.getForParticipant(actorUserId, rentalId);
    const businessId =
      side === 'renter' ? row.renterBusinessId : row.supplierBusinessId;
    await this.access.requireMembership(
      actorUserId,
      businessId,
      BusinessUserRole.Manager,
    );
    if (
      row.status !== RentalStatus.Pending &&
      row.status !== RentalStatus.Confirmed
    ) {
      throw new ConflictException('Rental cannot be cancelled in current state');
    }
    row.status = RentalStatus.Cancelled;
    row.cancellationReason = reason;
    const saved = await this.rentals.save(row);
    await this.bus.publishRentalEvent({ type: 'rental.cancelled', rentalId });
    return saved;
  }

  async createDeliveryStub(rentalId: string): Promise<Delivery | null> {
    const existing = await this.deliveries.findOne({ where: { rentalId } });
    if (existing) {
      return null;
    }
    const d = this.deliveries.create({
      rentalId,
      status: DeliveryStatus.Scheduled,
    });
    return this.deliveries.save(d);
  }
}
