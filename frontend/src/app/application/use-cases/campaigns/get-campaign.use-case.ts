import { inject, Injectable } from '@angular/core';
import { CAMPAIGN_REPOSITORY } from '../../../infrastructure/tokens/repository.tokens';
import type { Campaign } from '../../../domain/models/campaign.model';

@Injectable({ providedIn: 'root' })
export class GetCampaignUseCase {
  private readonly repo = inject(CAMPAIGN_REPOSITORY);

  ejecutar(id: number): Promise<Campaign> {
    return this.repo.obtener(id);
  }
}
