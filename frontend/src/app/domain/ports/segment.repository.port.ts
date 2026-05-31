import type { FilterGroup } from '../models/filter-tree.model';
import type { AudienceResult } from '../models/audience.model';

export interface SegmentRepositoryPort {
  resolverAudiencia(nodeId: string, filters: FilterGroup): Promise<AudienceResult>;
}

export const SEGMENT_REPOSITORY_PORT = 'SEGMENT_REPOSITORY_PORT';
