import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateBusinessDto {
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  legalName: string;

  /** Optional public/display name (dbo.businesses.name, schema2). */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  /** Optional tenant subdomain (dbo.businesses.subdomain); unique when set. */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, {
    message: 'subdomain must use letters, numbers, and hyphens between segments',
  })
  subdomain?: string;

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
