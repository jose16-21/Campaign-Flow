import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CONTACT_REPOSITORY_PORT } from '../../domain/contact.repository.port';
import type { ContactRepositoryPort } from '../../domain/contact.repository.port';

@Injectable()
export class DeleteContactUseCase {
  constructor(
    @Inject(CONTACT_REPOSITORY_PORT)
    private readonly repo: ContactRepositoryPort,
  ) {}

  async ejecutar(id: number): Promise<void> {
    const existente = await this.repo.obtenerPorId(id);
    if (!existente) {
      throw new NotFoundException({
        error: { code: 'CONTACTO_NO_ENCONTRADO', message: 'Contacto no encontrado' },
      });
    }
    await this.repo.softDelete(id);
  }
}
