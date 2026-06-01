import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SegmentsService } from './segments.service';
import type { FilterGroup } from '../filter-engine/domain/filter.types';

@ApiTags('Segmentos')
@Controller('segments')
export class SegmentsController {
  constructor(private readonly segmentsService: SegmentsService) {}

  @Post(':id/audience')
  @ApiOperation({
    summary: 'Resolver audiencia de un segmento',
    description:
      'Aplica el árbol de filtros AND/OR sobre el maestro de contactos y devuelve ' +
      'el total de coincidencias y una muestra de hasta 10 contactos.\n\n' +
      '**Operadores soportados:** `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `contains`\n\n' +
      '**Atributos dinámicos:** usar prefijo `attributes.` (ej. `attributes.plan`, `attributes.age`)\n\n' +
      '**Seguridad:** todas las queries usan `?` placeholders — sin concatenación de strings.',
  })
  @ApiBody({
    schema: {
      example: {
        filters: {
          op: 'AND',
          conditions: [
            { field: 'country', operator: 'eq', value: 'GT' },
            { field: 'status', operator: 'eq', value: 'ACTIVE' },
            {
              op: 'OR',
              conditions: [
                { field: 'attributes.plan', operator: 'eq', value: 'premium' },
                { field: 'attributes.age', operator: 'gt', value: 18 },
              ],
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '{ nodeId, total, contactos[] }',
    schema: {
      example: {
        nodeId: 'n1',
        total: 42,
        contactos: [
          { id: 1, first_name: 'Juan', last_name: 'Pérez', email: 'juan@test.com', country: 'GT', status: 'ACTIVE' },
        ],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Filtros inválidos o campo no permitido' })
  resolverAudiencia(
    @Param('id') id: string,
    @Body('filters') filters: FilterGroup,
  ) {
    return this.segmentsService.resolverAudiencia(id, filters);
  }
}
