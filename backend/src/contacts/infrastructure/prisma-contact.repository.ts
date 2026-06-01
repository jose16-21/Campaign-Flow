import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ContactRepositoryPort,
  ListarContactosQuery,
  PaginatedContacts,
} from '../domain/contact.repository.port';
import type { Contact, Prisma } from '@prisma/client';

@Injectable()
export class PrismaContactRepository implements ContactRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  crear(data: Prisma.ContactCreateInput): Promise<Contact> {
    return this.prisma.contact.create({ data });
  }

  async listar(query: ListarContactosQuery): Promise<PaginatedContacts> {
    const { page, pageSize, search } = query;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ContactWhereInput = { deleted_at: null };
    if (search) {
      where.OR = [
        { first_name: { contains: search } },
        { last_name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({ where, skip, take: pageSize }),
      this.prisma.contact.count({ where }),
    ]);

    return { data, page, pageSize, total };
  }

  obtenerPorId(id: number): Promise<Contact | null> {
    return this.prisma.contact.findFirst({ where: { id, deleted_at: null } });
  }

  obtenerPorEmail(email: string): Promise<Contact | null> {
    return this.prisma.contact.findUnique({ where: { email } });
  }

  actualizar(id: number, data: Prisma.ContactUpdateInput): Promise<Contact> {
    return this.prisma.contact.update({ where: { id }, data });
  }

  async softDelete(id: number): Promise<void> {
    await this.prisma.contact.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
