import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { EquipmentListingStatus } from '../../common/enums';

export class CreateEquipmentDto {
  @IsUUID()
  businessId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(300)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  dailyRateCents: number;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency?: string;
}

export class UpdateEquipmentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  dailyRateCents?: number;

  @IsOptional()
  @IsEnum(EquipmentListingStatus)
  listingStatus?: EquipmentListingStatus;
}

export class RegisterImageDto {
  @IsString()
  @MinLength(3)
  @MaxLength(1024)
  blobPath: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class SasUploadQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8)
  extension: string;
}
