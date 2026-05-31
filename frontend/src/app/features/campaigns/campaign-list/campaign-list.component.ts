import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ListCampaignsUseCase } from '../../../application/use-cases/campaigns/list-campaigns.use-case';
import { CAMPAIGN_REPOSITORY } from '../../../infrastructure/tokens/repository.tokens';
import type { Campaign } from '../../../domain/models/campaign.model';

@Component({
  selector: 'app-campaign-list',
  imports: [DatePipe, FormsModule],
  templateUrl: './campaign-list.component.html',
  styleUrl: './campaign-list.component.scss',
})
export class CampaignListComponent implements OnInit {
  private readonly listUseCase = inject(ListCampaignsUseCase);
  private readonly repo = inject(CAMPAIGN_REPOSITORY);
  private readonly router = inject(Router);

  readonly campanias = signal<Campaign[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly mostrarModal = signal(false);
  readonly guardando = signal(false);
  readonly exito = signal<string | null>(null);

  readonly form = signal({ name: '', description: '' });

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.campanias.set(await this.listUseCase.ejecutar());
    } catch {
      this.error.set('Error al cargar las campañas');
    } finally {
      this.cargando.set(false);
    }
  }

  abrirModal(): void {
    this.form.set({ name: '', description: '' });
    this.error.set(null);
    this.mostrarModal.set(true);
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
  }

  setNombre(value: string): void {
    this.form.update(f => ({ ...f, name: value }));
  }

  setDescripcion(value: string): void {
    this.form.update(f => ({ ...f, description: value }));
  }

  async confirmarCrear(): Promise<void> {
    const { name, description } = this.form();
    if (!name.trim()) return;

    this.guardando.set(true);
    this.error.set(null);
    try {
      const nueva = await this.repo.crear({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      this.mostrarModal.set(false);
      this.exito.set(`Campaña "${nueva.name}" creada. Abriendo editor...`);
      await this.cargar();
      setTimeout(() => {
        this.exito.set(null);
        this.router.navigate(['/campaigns', nueva.id]);
      }, 1500);
    } catch {
      this.error.set('Error al crear la campaña');
    } finally {
      this.guardando.set(false);
    }
  }

  abrir(id: number): void {
    this.router.navigate(['/campaigns', id]);
  }

  async eliminar(event: Event, id: number): Promise<void> {
    event.stopPropagation();
    if (!confirm('¿Eliminar esta campaña?')) return;
    try {
      await this.repo.eliminar(id);
      this.campanias.update((list) => list.filter((c) => c.id !== id));
    } catch {
      this.error.set('Error al eliminar la campaña');
    }
  }
}
