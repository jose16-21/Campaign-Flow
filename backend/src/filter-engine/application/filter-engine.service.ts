import { Inject, Injectable } from '@nestjs/common';
import { AUDIENCE_RESOLVER_PORT } from '../domain/audience-resolver.port';
import type { AudienceResolverPort, AudienciaResultado, ClausulaSQL } from '../domain/audience-resolver.port';
import type { FilterGroup, FilterNode } from '../domain/filter.types';

@Injectable()
export class FilterEngineService {
  constructor(
    @Inject(AUDIENCE_RESOLVER_PORT)
    private readonly resolver: AudienceResolverPort,
  ) {}

  construirWhere(nodo: FilterNode): ClausulaSQL {
    return this.resolver.construirWhere(nodo);
  }

  resolverAudiencia(filtros: FilterGroup): Promise<AudienciaResultado> {
    return this.resolver.resolver(filtros);
  }
}
