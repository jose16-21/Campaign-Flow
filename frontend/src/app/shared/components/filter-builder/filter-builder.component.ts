import { Component, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  FilterGroup,
  Condition,
  FilterNode,
  isFilterGroup,
  Operator,
  OPERATOR_LABELS,
  OPERADORES_SIN_VALOR,
  CAMPOS_DISPONIBLES,
} from '../../../domain/models/filter-tree.model';

@Component({
  selector: 'app-filter-builder',
  imports: [FormsModule],
  templateUrl: './filter-builder.component.html',
  styleUrl: './filter-builder.component.scss',
})
export class FilterBuilderComponent {
  readonly grupo = input.required<FilterGroup>();
  readonly nivel = input<number>(0);
  readonly grupoChange = output<FilterGroup>();

  readonly campos = CAMPOS_DISPONIBLES;
  readonly operadorLabels = OPERATOR_LABELS;
  readonly operadores = Object.keys(OPERATOR_LABELS) as Operator[];
  readonly operadoresSinValor = OPERADORES_SIN_VALOR;

  requiereValor(op: Operator): boolean {
    return !this.operadoresSinValor.has(op);
  }

  isGroup = isFilterGroup;

  asGroup(node: FilterNode): FilterGroup {
    return node as FilterGroup;
  }

  asCondition(node: FilterNode): Condition {
    return node as Condition;
  }

  toggleOp(): void {
    const actualizado: FilterGroup = {
      ...this.grupo(),
      op: this.grupo().op === 'AND' ? 'OR' : 'AND',
    };
    this.grupoChange.emit(actualizado);
  }

  agregarCondicion(): void {
    const nueva: Condition = { field: 'country', operator: 'eq', value: '' };
    this.grupoChange.emit({
      ...this.grupo(),
      conditions: [...this.grupo().conditions, nueva],
    });
  }

  agregarGrupo(): void {
    const nuevo: FilterGroup = { op: 'AND', conditions: [] };
    this.grupoChange.emit({
      ...this.grupo(),
      conditions: [...this.grupo().conditions, nuevo],
    });
  }

  actualizarCondicion(index: number, campo: keyof Condition, valor: unknown): void {
    const conditions = [...this.grupo().conditions];
    const condicion = { ...(conditions[index] as Condition), [campo]: valor };
    conditions[index] = condicion;
    this.grupoChange.emit({ ...this.grupo(), conditions });
  }

  actualizarSubgrupo(index: number, subgrupo: FilterGroup): void {
    const conditions = [...this.grupo().conditions];
    conditions[index] = subgrupo;
    this.grupoChange.emit({ ...this.grupo(), conditions });
  }

  eliminarNodo(index: number): void {
    const conditions = this.grupo().conditions.filter((_, i) => i !== index);
    this.grupoChange.emit({ ...this.grupo(), conditions });
  }
}
