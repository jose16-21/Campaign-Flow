import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ListContactsUseCase } from '../../../application/use-cases/contacts/list-contacts.use-case';
import { CreateContactUseCase } from '../../../application/use-cases/contacts/create-contact.use-case';
import { UpdateContactUseCase } from '../../../application/use-cases/contacts/update-contact.use-case';
import { DeleteContactUseCase } from '../../../application/use-cases/contacts/delete-contact.use-case';
import { FilterBuilderComponent } from '../../../shared/components/filter-builder/filter-builder.component';
import { ContactFormComponent } from '../../../shared/components/contact-form/contact-form.component';
import type { Contact, ContactsPage, CreateContactPayload } from '../../../domain/models/contact.model';
import type { FilterGroup } from '../../../domain/models/filter-tree.model';

@Component({
  selector: 'app-contact-list',
  imports: [FormsModule, DatePipe, FilterBuilderComponent, ContactFormComponent],
  templateUrl: './contact-list.component.html',
  styleUrl: './contact-list.component.scss',
})
export class ContactListComponent implements OnInit {
  private readonly listUseCase    = inject(ListContactsUseCase);
  private readonly createUseCase  = inject(CreateContactUseCase);
  private readonly updateUseCase  = inject(UpdateContactUseCase);
  private readonly deleteUseCase  = inject(DeleteContactUseCase);

  readonly resultado      = signal<ContactsPage | null>(null);
  readonly cargando       = signal(false);
  readonly error          = signal<string | null>(null);
  readonly exito          = signal<string | null>(null);
  readonly busqueda       = signal('');
  readonly pagina         = signal(1);
  readonly pageSize       = 20;
  readonly mostrarFiltros = signal(false);
  readonly filtros        = signal<FilterGroup>({ op: 'AND', conditions: [] });

  readonly modalAbierto   = signal(false);
  readonly contactoEditar = signal<Contact | null>(null);
  readonly guardando      = signal(false);

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

  onFiltrosChange(grupo: FilterGroup): void { this.filtros.set(grupo); }
  aplicarFiltros(): void { this.pagina.set(1); this.cargar(); }
  limpiarFiltros(): void { this.filtros.set({ op: 'AND', conditions: [] }); this.pagina.set(1); this.cargar(); }

  irPagina(pagina: number): void { this.pagina.set(pagina); this.cargar(); }

  abrirCrear(): void {
    this.contactoEditar.set(null);
    this.error.set(null);
    this.modalAbierto.set(true);
  }

  abrirEditar(c: Contact): void {
    this.contactoEditar.set(c);
    this.error.set(null);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void { this.modalAbierto.set(false); }

  async onConfirmar(payload: CreateContactPayload): Promise<void> {
    this.guardando.set(true);
    this.error.set(null);
    try {
      const edicion = this.contactoEditar();
      if (edicion) {
        await this.updateUseCase.ejecutar(edicion.id, payload);
        this.exito.set('Contacto actualizado correctamente');
      } else {
        await this.createUseCase.ejecutar(payload);
        this.exito.set('Contacto creado correctamente');
      }
      this.modalAbierto.set(false);
      await this.cargar();
      setTimeout(() => this.exito.set(null), 3000);
    } catch (e: unknown) {
      const msg = (e as { error?: { error?: { message?: string } } })?.error?.error?.message;
      this.error.set(msg ?? 'Error al guardar el contacto');
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminar(event: Event, c: Contact): Promise<void> {
    event.stopPropagation();
    if (!confirm(`¿Eliminar a ${c.first_name} ${c.last_name}?`)) return;
    try {
      await this.deleteUseCase.ejecutar(c.id);
      this.exito.set('Contacto eliminado');
      this.resultado.update(r => r
        ? { ...r, data: r.data.filter(x => x.id !== c.id), total: r.total - 1 }
        : r
      );
      setTimeout(() => this.exito.set(null), 2000);
    } catch {
      this.error.set('Error al eliminar el contacto');
    }
  }

  get totalPaginas(): number {
    const r = this.resultado();
    return r ? Math.ceil(r.total / this.pageSize) : 1;
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
