import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CONTACT_REPOSITORY_PORT } from '../../domain/contact.repository.port';
import type { ContactRepositoryPort } from '../../domain/contact.repository.port';
import type { UpdateContactDto } from '../../dto/update-contact.dto';
import type { Prisma } from '@prisma/client';

@Injectable()
export class UpdateContactUseCase {
  constructor(
    @Inject(CONTACT_REPOSITORY_PORT)
    private readonly repo: ContactRepositoryPort,
  ) {}

  async ejecutar(id: number, dto: UpdateContactDto) {
    const existente = await this.repo.obtenerPorId(id);
    if (!existente) {
      throw new NotFoundException({
        error: { code: 'CONTACTO_NO_ENCONTRADO', message: 'Contacto no encontrado' },
      });
    }

    if (dto.email && dto.email !== existente.email) {
      const emailEnUso = await this.repo.obtenerPorEmail(dto.email);
      if (emailEnUso) {
        throw new ConflictException({
          error: { code: 'EMAIL_DUPLICADO', message: 'El email ya está en uso' },
        });
      }
    }

    return this.repo.actualizar(id, {
      ...dto,
      attributes: dto.attributes
        ? (dto.attributes as Prisma.InputJsonValue)
        : undefined,
    });
  }
}
