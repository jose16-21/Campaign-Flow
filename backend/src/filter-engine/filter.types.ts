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

export function isFilterGroup(node: FilterNode): node is FilterGroup {
  return 'op' in node && 'conditions' in node;
}
