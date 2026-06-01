import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EstadoCampaña {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
}

export class CreateCampaignDto {
  @ApiProperty({ example: 'Campaña de bienvenida' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Mensaje para nuevos contactos activos de Guatemala' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: EstadoCampaña, default: EstadoCampaña.DRAFT })
  @IsOptional()
  @IsEnum(EstadoCampaña)
  status?: EstadoCampaña;
}
