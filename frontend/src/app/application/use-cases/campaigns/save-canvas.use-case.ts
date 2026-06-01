import { inject, Injectable } from '@angular/core';
import { CAMPAIGN_REPOSITORY } from '../../../infrastructure/tokens/repository.tokens';
import type { Campaign, Canvas } from '../../../domain/models/campaign.model';

@Injectable({ providedIn: 'root' })
export class SaveCanvasUseCase {
  private readonly repo = inject(CAMPAIGN_REPOSITORY);

  ejecutar(campaignId: number, canvas: Canvas): Promise<Campaign> {
    return this.repo.guardarCanvas(campaignId, canvas);
  }
}
