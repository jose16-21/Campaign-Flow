import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EstadoContacto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class CreateContactDto {
  @ApiProperty({ example: 'Juan', description: 'Nombre del contacto (requerido)' })
  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @ApiProperty({ example: 'Pérez', description: 'Apellido del contacto (requerido)' })
  @IsString()
  @IsNotEmpty()
  last_name!: string;

  @ApiProperty({ example: 'juan@ejemplo.com', description: 'Email único del contacto' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+502 5555 5555' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s\-().]{7,20}$/, { message: 'Formato de teléfono inválido' })
  phone?: string;

  @ApiPropertyOptional({ example: 'GT', description: 'Código de país ISO-2' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Guatemala' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: EstadoContacto, default: EstadoContacto.ACTIVE })
  @IsOptional()
  @IsEnum(EstadoContacto)
  status?: EstadoContacto;

  @ApiPropertyOptional({
    description: 'Atributos dinámicos del contacto (sin schema fijo)',
    example: { plan: 'premium', age: 30, last_purchase_days: 15 },
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}
