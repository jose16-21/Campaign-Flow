import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export enum EstadoContacto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  last_name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s\-().]{7,20}$/, {
    message: 'Formato de teléfono inválido',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(EstadoContacto)
  status?: EstadoContacto;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}
