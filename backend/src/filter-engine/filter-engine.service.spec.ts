import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FilterEngineService } from './filter-engine.service';
import { PrismaService } from '../prisma/prisma.service';

const prismaMock = { $queryRawUnsafe: jest.fn() };

describe('FilterEngineService', () => {
  let service: FilterEngineService;

  beforeEach(async () => {
    const modulo = await Test.createTestingModule({
      providers: [
        FilterEngineService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = modulo.get(FilterEngineService);
  });

  describe('construirWhere — condiciones simples', () => {
    it('eq genera columna directa con =', () => {
      const { sql, params } = service.construirWhere({
        field: 'country',
        operator: 'eq',
        value: 'GT',
      });
      expect(sql).toBe('c.country = ?');
      expect(params).toEqual(['GT']);
    });

    it('neq genera !=', () => {
      const { sql, params } = service.construirWhere({
        field: 'status',
        operator: 'neq',
        value: 'INACTIVE',
      });
      expect(sql).toBe('c.status != ?');
      expect(params).toEqual(['INACTIVE']);
    });

    it('gt genera >', () => {
      const { sql, params } = service.construirWhere({
        field: 'created_at',
        operator: 'gt',
        value: '2025-01-01',
      });
      expect(sql).toBe('c.created_at > ?');
      expect(params).toEqual(['2025-01-01']);
    });

    it('gte genera >=', () => {
      const { sql } = service.construirWhere({
        field: 'created_at',
        operator: 'gte',
        value: '2025-01-01',
      });
      expect(sql).toBe('c.created_at >= ?');
    });

    it('lt genera <', () => {
      const { sql } = service.construirWhere({
        field: 'created_at',
        operator: 'lt',
        value: '2025-12-31',
      });
      expect(sql).toBe('c.created_at < ?');
    });

    it('lte genera <=', () => {
      const { sql } = service.construirWhere({
        field: 'created_at',
        operator: 'lte',
        value: '2025-12-31',
      });
      expect(sql).toBe('c.created_at <= ?');
    });

    it('in genera IN con múltiples placeholders', () => {
      const { sql, params } = service.construirWhere({
        field: 'country',
        operator: 'in',
        value: ['GT', 'MX', 'CO'],
      });
      expect(sql).toBe('c.country IN (?, ?, ?)');
      expect(params).toEqual(['GT', 'MX', 'CO']);
    });

    it('contains genera LIKE con %valor%', () => {
      const { sql, params } = service.construirWhere({
        field: 'first_name',
        operator: 'contains',
        value: 'Juan',
      });
      expect(sql).toBe('c.first_name LIKE ?');
      expect(params).toEqual(['%Juan%']);
    });
  });

  describe('construirWhere — atributos dinámicos', () => {
    it('attributes.plan genera JSON_EXTRACT correcto', () => {
      const { sql, params } = service.construirWhere({
        field: 'attributes.plan',
        operator: 'eq',
        value: 'premium',
      });
      expect(sql).toBe(
        "JSON_UNQUOTE(JSON_EXTRACT(c.attributes, '$.plan')) = ?",
      );
      expect(params).toEqual(['premium']);
    });

    it('attributes.age con gt genera comparación numérica', () => {
      const { sql, params } = service.construirWhere({
        field: 'attributes.age',
        operator: 'gt',
        value: 18,
      });
      expect(sql).toBe(
        "JSON_UNQUOTE(JSON_EXTRACT(c.attributes, '$.age')) > ?",
      );
      expect(params).toEqual([18]);
    });

    it('attributes.last_purchase_days con lte', () => {
      const { sql } = service.construirWhere({
        field: 'attributes.last_purchase_days',
        operator: 'lte',
        value: 30,
      });
      expect(sql).toBe(
        "JSON_UNQUOTE(JSON_EXTRACT(c.attributes, '$.last_purchase_days')) <= ?",
      );
    });

    it('rechaza nombre de atributo con caracteres inválidos', () => {
      expect(() =>
        service.construirWhere({
          field: 'attributes.plan; DROP TABLE',
          operator: 'eq',
          value: 'x',
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('construirWhere — grupos AND/OR', () => {
    it('AND con dos condiciones', () => {
      const { sql, params } = service.construirWhere({
        op: 'AND',
        conditions: [
          { field: 'country', operator: 'eq', value: 'GT' },
          { field: 'status', operator: 'eq', value: 'ACTIVE' },
        ],
      });
      expect(sql).toBe('(c.country = ?) AND (c.status = ?)');
      expect(params).toEqual(['GT', 'ACTIVE']);
    });

    it('OR con dos condiciones', () => {
      const { sql, params } = service.construirWhere({
        op: 'OR',
        conditions: [
          { field: 'attributes.plan', operator: 'eq', value: 'premium' },
          { field: 'attributes.age', operator: 'gt', value: 18 },
        ],
      });
      expect(sql).toContain('OR');
      expect(params).toEqual(['premium', 18]);
    });

    it('AND/OR anidado genera paréntesis correctos', () => {
      const { sql, params } = service.construirWhere({
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
      });
      expect(sql).toContain('AND');
      expect(sql).toContain('OR');
      expect(params).toEqual(['GT', 'ACTIVE', 'premium', 18]);
    });

    it('grupo vacío lanza BadRequestException', () => {
      expect(() =>
        service.construirWhere({ op: 'AND', conditions: [] }),
      ).toThrow(BadRequestException);
    });
  });

  describe('seguridad — sin concatenación de valores', () => {
    it('el SQL nunca contiene el valor directamente', () => {
      const valorInyeccion = "'; DROP TABLE contacts; --";
      const { sql, params } = service.construirWhere({
        field: 'email',
        operator: 'eq',
        value: valorInyeccion,
      });
      expect(sql).not.toContain(valorInyeccion);
      expect(params).toContain(valorInyeccion);
    });

    it('campo desconocido lanza BadRequestException', () => {
      expect(() =>
        service.construirWhere({
          field: 'campo_no_existe',
          operator: 'eq',
          value: 'x',
        }),
      ).toThrow(BadRequestException);
    });
  });
});
