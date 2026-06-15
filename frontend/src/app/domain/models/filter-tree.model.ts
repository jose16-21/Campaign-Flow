export type Operator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'contains'
  | 'is_empty'
  | 'is_not_empty';

export const OPERADORES_SIN_VALOR = new Set<Operator>(['is_empty', 'is_not_empty']);

export interface Condition {
  field: string;
  operator: Operator;
  value: unknown;
}

export interface FilterGroup {
  op: 'AND' | 'OR';
  conditions: (Condition | FilterGroup)[];
}

export type FilterNode = Condition | FilterGroup;

export function isFilterGroup(node: Condition | FilterGroup): node is FilterGroup {
  return 'op' in node;
}

export const OPERATOR_LABELS: Record<Operator, string> = {
  eq: 'igual a',
  neq: 'distinto de',
  gt: 'mayor que',
  gte: 'mayor o igual que',
  lt: 'menor que',
  lte: 'menor o igual que',
  in: 'está en',
  contains: 'contiene',
  is_empty: 'está vacío',
  is_not_empty: 'no está vacío',
};

export const CAMPOS_DISPONIBLES = [
  { value: 'country', label: 'País' },
  { value: 'city', label: 'Ciudad' },
  { value: 'status', label: 'Estado' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Teléfono' },
  { value: 'created_at', label: 'Fecha de creación' },
  { value: 'attributes.plan', label: 'Plan (atributo)' },
  { value: 'attributes.age', label: 'Edad (atributo)' },
  { value: 'attributes.last_purchase_days', label: 'Días última compra (atributo)' },
] as const;
