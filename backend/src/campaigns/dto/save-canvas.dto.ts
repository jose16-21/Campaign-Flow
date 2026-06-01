import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CanvasNodeDto {
  id!: string;
  type!: string;
  x!: number;
  y!: number;
  config!: Record<string, unknown>;
}

export class CanvasEdgeDto {
  source!: string;
  target!: string;
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
