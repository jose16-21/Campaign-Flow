import { inject, Injectable } from '@angular/core';
import { CONTACT_REPOSITORY } from '../../../infrastructure/tokens/repository.tokens';
import type { ContactsPage, ContactsQuery } from '../../../domain/models/contact.model';

@Injectable({ providedIn: 'root' })
export class ListContactsUseCase {
  private readonly repo = inject(CONTACT_REPOSITORY);

  ejecutar(query: ContactsQuery = {}): Promise<ContactsPage> {
    return this.repo.listar(query);
  }
}
