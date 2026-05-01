import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ConditionPhase } from '../../common/enums';

export class CreateRentalDto {
  @IsUUID()
  equipmentId: string;

  @IsUUID()
  renterBusinessId: string;

  @Type(() => Date)
  @IsDate()
  startAt: Date;

  @Type(() => Date)
  @IsDate()
  endAt: Date;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500_000_000)
  depositAmountCents?: number;
}

export class UpsertConditionDto {
  @IsUUID()
  rentalId: string;

  @IsEnum(ConditionPhase)
  phase: ConditionPhase;

  @IsOptional()
  @IsString()
  notes?: string;
}
