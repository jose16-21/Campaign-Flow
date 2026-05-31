import { inject, Injectable } from '@angular/core';
import { SegmentRepositoryPort, SEGMENT_REPOSITORY_PORT } from '../../../domain/ports/segment.repository.port';
import type { FilterGroup } from '../../../domain/models/filter-tree.model';
import type { AudienceResult } from '../../../domain/models/audience.model';

@Injectable({ providedIn: 'root' })
export class ResolveAudienceUseCase {
  private readonly repo = inject<SegmentRepositoryPort>(SEGMENT_REPOSITORY_PORT as never);

  ejecutar(nodeId: string, filters: FilterGroup): Promise<AudienceResult> {
    return this.repo.resolverAudiencia(nodeId, filters);
  }
}
