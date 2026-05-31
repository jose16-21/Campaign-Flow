import { inject, Injectable } from '@angular/core';
import { CampaignRepositoryPort, CAMPAIGN_REPOSITORY_PORT } from '../../../domain/ports/campaign.repository.port';
import type { Campaign, Canvas } from '../../../domain/models/campaign.model';

@Injectable({ providedIn: 'root' })
export class SaveCanvasUseCase {
  private readonly repo = inject<CampaignRepositoryPort>(CAMPAIGN_REPOSITORY_PORT as never);

  ejecutar(campaignId: number, canvas: Canvas): Promise<Campaign> {
    return this.repo.guardarCanvas(campaignId, canvas);
  }
}
