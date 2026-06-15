import { IsArray, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CanvasNodeDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsNumber()
  x!: number;

  @IsNumber()
  y!: number;

  @IsObject()
  config!: Record<string, unknown>;
}

export class CanvasEdgeDto {
  @IsString()
  @IsNotEmpty()
  source!: string;

  @IsString()
  @IsNotEmpty()
  target!: string;

  @IsOptional()
  @IsString()
  condicion?: string;

  @IsOptional()
  @IsString()
  etiqueta?: string;
}

export class SaveCanvasDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CanvasNodeDto)
  nodes!: CanvasNodeDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CanvasEdgeDto)
  edges!: CanvasEdgeDto[];
}
