import { inject, Injectable } from '@angular/core';
import { CONTACT_REPOSITORY } from '../../../infrastructure/tokens/repository.tokens';
import type { Contact, CreateContactPayload } from '../../../domain/models/contact.model';

@Injectable({ providedIn: 'root' })
export class CreateContactUseCase {
  private readonly repo = inject(CONTACT_REPOSITORY);

  ejecutar(payload: CreateContactPayload): Promise<Contact> {
    return this.repo.crear(payload);
  }
}
