import { Body, Controller, Param, Post } from '@nestjs/common';
import { SegmentsService } from './segments.service';
import type { FilterGroup } from '../filter-engine/filter.types';

@Controller('segments')
export class SegmentsController {
  constructor(private readonly segmentsService: SegmentsService) {}

  @Post(':id/audience')
  resolverAudiencia(
    @Param('id') id: string,
    @Body('filters') filters: FilterGroup,
  ) {
    return this.segmentsService.resolverAudiencia(id, filters);
  }
}
