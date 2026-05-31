import { Inject, Injectable } from '@nestjs/common';
import { CONTACT_REPOSITORY_PORT } from '../../domain/contact.repository.port';
import type { ContactRepositoryPort } from '../../domain/contact.repository.port';
import { FilterEngineService } from '../../../filter-engine/application/filter-engine.service';
import type { QueryContactDto } from '../../dto/query-contact.dto';

@Injectable()
export class ListContactsUseCase {
  constructor(
    @Inject(CONTACT_REPOSITORY_PORT)
    private readonly repo: ContactRepositoryPort,
    private readonly filterEngine: FilterEngineService,
  ) {}

  async ejecutar(query: QueryContactDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    if (query.filters) {
      const { total, contactos } = await this.filterEngine.resolverAudiencia(query.filters);
      return { data: contactos, page, pageSize, total };
    }

    return this.repo.listar({ page, pageSize, search: query.search });
  }
}
