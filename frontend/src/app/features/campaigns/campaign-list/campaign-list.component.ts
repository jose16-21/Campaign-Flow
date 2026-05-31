import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ListCampaignsUseCase } from '../../../application/use-cases/campaigns/list-campaigns.use-case';
import { CAMPAIGN_REPOSITORY } from '../../../infrastructure/tokens/repository.tokens';
import type { Campaign } from '../../../domain/models/campaign.model';

@Component({
  selector: 'app-campaign-list',
  imports: [DatePipe],
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

  async crear(): Promise<void> {
    try {
      const nueva = await this.repo.crear({ name: 'Nueva campaña' });
      await this.router.navigate(['/campaigns', nueva.id]);
    } catch {
      this.error.set('Error al crear la campaña');
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
