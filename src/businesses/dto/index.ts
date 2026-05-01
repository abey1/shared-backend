import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateBusinessDto {
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  legalName: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  taxId?: string;
}

export class AddMemberDto {
  @IsUUID()
  userId: string;

  @IsString()
  role: 'owner' | 'admin' | 'manager' | 'member';
}
