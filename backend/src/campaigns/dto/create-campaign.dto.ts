import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum EstadoCampaña {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
}

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(EstadoCampaña)
  status?: EstadoCampaña;
}
