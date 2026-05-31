import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ListContactsUseCase } from '../../../application/use-cases/contacts/list-contacts.use-case';
import type { Contact, ContactsPage } from '../../../domain/models/contact.model';
import type { FilterGroup } from '../../../domain/models/filter-tree.model';
import { FilterBuilderComponent } from '../../../shared/components/filter-builder/filter-builder.component';

@Component({
  selector: 'app-contact-list',
  imports: [FormsModule, DatePipe, FilterBuilderComponent],
  templateUrl: './contact-list.component.html',
  styleUrl: './contact-list.component.scss',
})
export class ContactListComponent implements OnInit {
  private readonly listUseCase = inject(ListContactsUseCase);

  readonly resultado = signal<ContactsPage | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly busqueda = signal('');
  readonly pagina = signal(1);
  readonly pageSize = 20;
  readonly mostrarFiltros = signal(false);
  readonly filtros = signal<FilterGroup>({ op: 'AND', conditions: [] });

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const query = {
        page: this.pagina(),
        pageSize: this.pageSize,
        search: this.busqueda() || undefined,
        filters: this.filtros().conditions.length > 0 ? this.filtros() : undefined,
      };
      this.resultado.set(await this.listUseCase.ejecutar(query));
    } catch {
      this.error.set('Error al cargar los contactos');
    } finally {
      this.cargando.set(false);
    }
  }

  onBusqueda(termino: string): void {
    this.busqueda.set(termino);
    this.pagina.set(1);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.cargar(), 300);
  }

  onFiltrosChange(grupo: FilterGroup): void {
    this.filtros.set(grupo);
  }

  aplicarFiltros(): void {
    this.pagina.set(1);
    this.cargar();
  }

  limpiarFiltros(): void {
    this.filtros.set({ op: 'AND', conditions: [] });
    this.pagina.set(1);
    this.cargar();
  }

  irPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar();
  }

  get totalPaginas(): number {
    const r = this.resultado();
    if (!r) return 1;
    return Math.ceil(r.total / this.pageSize);
  }

  get paginas(): number[] {
    const total = this.totalPaginas;
    const actual = this.pagina();
    const inicio = Math.max(1, actual - 2);
    const fin = Math.min(total, actual + 2);
    return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
  }

  estadoLabel(c: Contact): string {
    return c.status === 'ACTIVE' ? 'Activo' : 'Inactivo';
  }
}
