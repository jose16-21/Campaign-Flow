import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  FilterNode,
  FilterGroup,
  Condition,
  isFilterGroup,
} from './filter.types';

const CAMPOS_DIRECTOS = new Set([
  'first_name',
  'last_name',
  'email',
  'phone',
  'country',
  'city',
  'status',
  'created_at',
]);

const OPERADORES_SQL: Record<string, string> = {
  eq: '=',
  neq: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
};

interface ClausulaSQL {
  sql: string;
  params: unknown[];
}

@Injectable()
export class FilterEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async resolverAudiencia(
    filtros: FilterGroup,
  ): Promise<{ total: number; contactos: Record<string, unknown>[] }> {
    const { sql, params } = this.construirWhere(filtros);

    const query = `
      SELECT id, first_name, last_name, email, phone, country, city, status, created_at, attributes
      FROM contacts c
      WHERE deleted_at IS NULL
        AND (${sql})
      LIMIT 10
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM contacts c
      WHERE deleted_at IS NULL
        AND (${sql})
    `;

    const [contactos, countResult] = await Promise.all([
      this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(query, ...params),
      this.prisma.$queryRawUnsafe<[{ total: bigint }]>(countQuery, ...params),
    ]);

    return {
      total: Number(countResult[0].total),
      contactos,
    };
  }

  construirWhere(nodo: FilterNode): ClausulaSQL {
    if (isFilterGroup(nodo)) {
      return this.construirGrupo(nodo);
    }
    return this.construirCondicion(nodo);
  }

  private construirGrupo(grupo: FilterGroup): ClausulaSQL {
    if (!grupo.conditions || grupo.conditions.length === 0) {
      throw new BadRequestException(
        'Un grupo de filtros debe tener al menos una condición',
      );
    }

    const partes: string[] = [];
    const params: unknown[] = [];

    for (const hijo of grupo.conditions) {
      const clausula = this.construirWhere(hijo);
      partes.push(`(${clausula.sql})`);
      params.push(...clausula.params);
    }

    return {
      sql: partes.join(` ${grupo.op} `),
      params,
    };
  }

  private construirCondicion(condicion: Condition): ClausulaSQL {
    const columna = this.resolverColumna(condicion.field);

    if (condicion.operator === 'in') {
      const valores = Array.isArray(condicion.value)
        ? condicion.value
        : [condicion.value];
      const placeholders = valores.map(() => '?').join(', ');
      return {
        sql: `${columna} IN (${placeholders})`,
        params: valores,
      };
    }

    if (condicion.operator === 'contains') {
      return {
        sql: `${columna} LIKE ?`,
        params: [`%${condicion.value}%`],
      };
    }

    const operadorSQL = OPERADORES_SQL[condicion.operator];
    if (!operadorSQL) {
      throw new BadRequestException(
        `Operador no soportado: ${condicion.operator}`,
      );
    }

    return {
      sql: `${columna} ${operadorSQL} ?`,
      params: [condicion.value],
    };
  }

  private resolverColumna(campo: string): string {
    if (CAMPOS_DIRECTOS.has(campo)) {
      return `c.${campo}`;
    }

    if (campo.startsWith('attributes.')) {
      const clave = campo.slice('attributes.'.length);
      if (!/^[a-zA-Z0-9_]+$/.test(clave)) {
        throw new BadRequestException(
          `Nombre de atributo inválido: ${clave}`,
        );
      }
      return `JSON_UNQUOTE(JSON_EXTRACT(c.attributes, '$.${clave}'))`;
    }

    throw new BadRequestException(`Campo no permitido: ${campo}`);
  }
}
