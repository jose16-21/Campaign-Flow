import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { CampaignRepositoryPort } from '../../domain/ports/campaign.repository.port';
import type { Campaign, Canvas, CreateCampaignPayload } from '../../domain/models/campaign.model';

@Injectable({ providedIn: 'root' })
export class HttpCampaignRepository implements CampaignRepositoryPort {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/campaigns`;

  listar(): Promise<Campaign[]> {
    return firstValueFrom(this.http.get<Campaign[]>(this.base));
  }

  obtener(id: number): Promise<Campaign> {
    return firstValueFrom(this.http.get<Campaign>(`${this.base}/${id}`));
  }

  crear(payload: CreateCampaignPayload): Promise<Campaign> {
    return firstValueFrom(this.http.post<Campaign>(this.base, payload));
  }

  actualizar(id: number, payload: Partial<CreateCampaignPayload>): Promise<Campaign> {
    return firstValueFrom(this.http.put<Campaign>(`${this.base}/${id}`, payload));
  }

  eliminar(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/${id}`));
  }

  guardarCanvas(id: number, canvas: Canvas): Promise<Campaign> {
    return firstValueFrom(this.http.put<Campaign>(`${this.base}/${id}/canvas`, canvas));
  }
}
