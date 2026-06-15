import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
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

  @ApiPropertyOptional({ example: 'es', default: 'es', description: 'Código de idioma BCP-47 (es, en, pt…)' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @ApiPropertyOptional({ example: '1107b43e-997a-42f9-9101-9e238d4ccef8', description: 'UUID del tenant propietario' })
  @IsOptional()
  @IsString()
  owner_id?: string;
}
