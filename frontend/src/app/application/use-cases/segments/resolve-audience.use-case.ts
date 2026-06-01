import { inject, Injectable } from '@angular/core';
import { SEGMENT_REPOSITORY } from '../../../infrastructure/tokens/repository.tokens';
import type { FilterGroup } from '../../../domain/models/filter-tree.model';
import type { AudienceResult } from '../../../domain/models/audience.model';

@Injectable({ providedIn: 'root' })
export class ResolveAudienceUseCase {
  private readonly repo = inject(SEGMENT_REPOSITORY);

  ejecutar(nodeId: string, filters: FilterGroup): Promise<AudienceResult> {
    return this.repo.resolverAudiencia(nodeId, filters);
  }
}
