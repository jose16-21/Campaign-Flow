import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { SegmentRepositoryPort } from '../../domain/ports/segment.repository.port';
import type { FilterGroup } from '../../domain/models/filter-tree.model';
import type { AudienceResult } from '../../domain/models/audience.model';

@Injectable({ providedIn: 'root' })
export class HttpSegmentRepository implements SegmentRepositoryPort {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/segments`;

  resolverAudiencia(nodeId: string, filters: FilterGroup): Promise<AudienceResult> {
    return firstValueFrom(
      this.http.post<AudienceResult>(`${this.base}/${nodeId}/audience`, { filters }),
    );
  }
}
