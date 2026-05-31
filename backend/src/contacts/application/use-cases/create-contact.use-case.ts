import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { CONTACT_REPOSITORY_PORT } from '../../domain/contact.repository.port';
import type { ContactRepositoryPort } from '../../domain/contact.repository.port';
import type { CreateContactDto } from '../../dto/create-contact.dto';
import type { Prisma } from '@prisma/client';

@Injectable()
export class CreateContactUseCase {
  constructor(
    @Inject(CONTACT_REPOSITORY_PORT)
    private readonly repo: ContactRepositoryPort,
  ) {}

  async ejecutar(dto: CreateContactDto) {
    const existe = await this.repo.obtenerPorEmail(dto.email);
    if (existe) {
      throw new ConflictException({
        error: { code: 'EMAIL_DUPLICADO', message: 'El email ya está en uso' },
      });
    }
    return this.repo.crear({
      ...dto,
      attributes: (dto.attributes as Prisma.InputJsonValue) ?? {},
    });
  }
}
