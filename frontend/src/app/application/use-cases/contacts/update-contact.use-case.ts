import { inject, Injectable } from '@angular/core';
import { CONTACT_REPOSITORY } from '../../../infrastructure/tokens/repository.tokens';
import type { Contact, CreateContactPayload } from '../../../domain/models/contact.model';

@Injectable({ providedIn: 'root' })
export class UpdateContactUseCase {
  private readonly repo = inject(CONTACT_REPOSITORY);

  ejecutar(id: number, payload: Partial<CreateContactPayload>): Promise<Contact> {
    return this.repo.actualizar(id, payload);
  }
}
