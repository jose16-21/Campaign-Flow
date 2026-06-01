import { inject, Injectable } from '@angular/core';
import { CONTACT_REPOSITORY } from '../../../infrastructure/tokens/repository.tokens';

@Injectable({ providedIn: 'root' })
export class DeleteContactUseCase {
  private readonly repo = inject(CONTACT_REPOSITORY);

  ejecutar(id: number): Promise<void> {
    return this.repo.eliminar(id);
  }
}
