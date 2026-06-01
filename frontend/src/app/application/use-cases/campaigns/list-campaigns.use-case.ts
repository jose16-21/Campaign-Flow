import { inject, Injectable } from '@angular/core';
import { CAMPAIGN_REPOSITORY } from '../../../infrastructure/tokens/repository.tokens';
import type { Campaign } from '../../../domain/models/campaign.model';

@Injectable({ providedIn: 'root' })
export class ListCampaignsUseCase {
  private readonly repo = inject(CAMPAIGN_REPOSITORY);

  ejecutar(): Promise<Campaign[]> {
    return this.repo.listar();
  }
}
