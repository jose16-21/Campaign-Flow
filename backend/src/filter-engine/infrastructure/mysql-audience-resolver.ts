import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AudienceResolverPort, AudienciaResultado } from '../domain/audience-resolver.port';
import type { FilterGroup, FilterNode, Condition } from '../domain/filter.types';
import { isFilterGroup } from '../domain/filter.types';

type Operator = Condition['operator'];

const CAMPOS_DIRECTOS = new Set([
  'first_name', 'last_name', 'email', 'phone',
  'country', 'city', 'status', 'created_at',
]);

const OPERADORES_SQL: Record<string, string> = {
  eq: '=', neq: '!=', gt: '>', gte: '>=', lt: '<', lte: '<=',
};

interface ClausulaSQL {
  sql: string;
  params: unknown[];
}

@Injectable()
export class MysqlAudienceResolver implements AudienceResolverPort {
  constructor(private readonly prisma: PrismaService) {}

  async resolver(filtros: FilterGroup, limite = 10): Promise<AudienciaResultado> {
    const { sql, params } = this.construirWhere(filtros);

    const baseWhere = `deleted_at IS NULL AND (${sql})`;

    const [contactos, countResult] = await Promise.all([
      this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT id, first_name, last_name, email, phone, country, city, status, created_at, attributes
         FROM contacts c WHERE ${baseWhere} LIMIT ${limite}`,
        ...params,
      ),
      this.prisma.$queryRawUnsafe<[{ total: bigint }]>(
        `SELECT COUNT(*) as total FROM contacts c WHERE ${baseWhere}`,
        ...params,
      ),
    ]);

    return { total: Number(countResult[0].total), contactos };
  }

  construirWhere(nodo: FilterNode): ClausulaSQL {
    if (isFilterGroup(nodo)) return this.construirGrupo(nodo);
    return this.construirCondicion(nodo);
  }

  private construirGrupo(grupo: FilterGroup): ClausulaSQL {
    if (!grupo.conditions?.length) {
      throw new BadRequestException('Un grupo de filtros debe tener al menos una condición');
    }
    const partes: string[] = [];
    const params: unknown[] = [];
    for (const hijo of grupo.conditions) {
      const c = this.construirWhere(hijo);
      partes.push(`(${c.sql})`);
      params.push(...c.params);
    }
    return { sql: partes.join(` ${grupo.op} `), params };
  }

  private construirCondicion(condicion: Condition): ClausulaSQL {
    const columna = this.resolverColumna(condicion.field);

    if (condicion.operator === 'is_empty') {
      return { sql: `(${columna} IS NULL OR ${columna} = '')`, params: [] };
    }

    if (condicion.operator === 'is_not_empty') {
      return { sql: `(${columna} IS NOT NULL AND ${columna} != '')`, params: [] };
    }

    if (condicion.operator === 'in') {
      const valores = Array.isArray(condicion.value) ? condicion.value : [condicion.value];
      return { sql: `${columna} IN (${valores.map(() => '?').join(', ')})`, params: valores };
    }

    if (condicion.operator === 'contains') {
      return { sql: `${columna} LIKE ?`, params: [`%${condicion.value}%`] };
    }

    const op = OPERADORES_SQL[condicion.operator as Operator];
    if (!op) throw new BadRequestException(`Operador no soportado: ${condicion.operator}`);
    return { sql: `${columna} ${op} ?`, params: [condicion.value] };
  }

  private resolverColumna(campo: string): string {
    if (CAMPOS_DIRECTOS.has(campo)) return `c.${campo}`;
    if (campo.startsWith('attributes.')) {
      const clave = campo.slice('attributes.'.length);
      if (!/^[a-zA-Z0-9_]+$/.test(clave)) {
        throw new BadRequestException(`Nombre de atributo inválido: ${clave}`);
      }
      return `JSON_UNQUOTE(JSON_EXTRACT(c.attributes, '$.${clave}'))`;
    }
    throw new BadRequestException(`Campo no permitido: ${campo}`);
  }
}
