import { Injectable, BadRequestException } from '@nestjs/common';
import { FilterEngineService } from '../filter-engine/filter-engine.service';
import { FilterGroup } from '../filter-engine/filter.types';

@Injectable()
export class SegmentsService {
  constructor(private readonly filterEngine: FilterEngineService) {}

  async resolverAudiencia(nodeId: string, filters: FilterGroup) {
    if (!filters) {
      throw new BadRequestException({
        error: {
          code: 'FILTROS_REQUERIDOS',
          message: 'Se requiere el árbol de filtros en el campo "filters"',
        },
      });
    }

    const resultado = await this.filterEngine.resolverAudiencia(filters);
    return {
      nodeId,
      total: resultado.total,
      contactos: resultado.contactos,
    };
  }
}
