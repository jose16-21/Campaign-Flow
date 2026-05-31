import type { FilterGroup, FilterNode } from './filter.types';

export interface AudienciaResultado {
  total: number;
  contactos: Record<string, unknown>[];
}

export interface ClausulaSQL {
  sql: string;
  params: unknown[];
}

export interface AudienceResolverPort {
  construirWhere(nodo: FilterNode): ClausulaSQL;
  resolver(filtros: FilterGroup, limite?: number): Promise<AudienciaResultado>;
}

export const AUDIENCE_RESOLVER_PORT = 'AUDIENCE_RESOLVER_PORT';
