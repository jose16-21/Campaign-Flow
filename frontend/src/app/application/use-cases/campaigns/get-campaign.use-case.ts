import { inject, Injectable } from '@angular/core';
import { CampaignRepositoryPort, CAMPAIGN_REPOSITORY_PORT } from '../../../domain/ports/campaign.repository.port';
import type { Campaign } from '../../../domain/models/campaign.model';

@Injectable({ providedIn: 'root' })
export class GetCampaignUseCase {
  private readonly repo = inject<CampaignRepositoryPort>(CAMPAIGN_REPOSITORY_PORT as never);

  ejecutar(id: number): Promise<Campaign> {
    return this.repo.obtener(id);
  }
}
