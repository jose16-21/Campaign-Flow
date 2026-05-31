import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilterEngineService } from '../filter-engine/filter-engine.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { QueryContactDto } from './dto/query-contact.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filterEngine: FilterEngineService,
  ) {}

  async crear(dto: CreateContactDto) {
    const existe = await this.prisma.contact.findUnique({
      where: { email: dto.email },
    });
    if (existe) {
      throw new ConflictException({
        error: { code: 'EMAIL_DUPLICADO', message: 'El email ya está en uso' },
      });
    }

    return this.prisma.contact.create({
      data: {
        ...dto,
        attributes: (dto.attributes as Prisma.InputJsonValue) ?? {},
      },
    });
  }

  async listar(query: QueryContactDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ContactWhereInput = { deleted_at: null };

    if (query.search) {
      const termino = query.search;
      where.OR = [
        { first_name: { contains: termino } },
        { last_name: { contains: termino } },
        { email: { contains: termino } },
      ];
    }

    if (query.filters) {
      const { total, contactos } = await this.filterEngine.resolverAudiencia(
        query.filters,
      );
      const ids = (contactos as { id: number }[]).map((c) => c.id);
      return {
        data: contactos,
        page,
        pageSize,
        total,
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({ where, skip, take: pageSize }),
      this.prisma.contact.count({ where }),
    ]);

    return { data, page, pageSize, total };
  }

  async obtener(id: number) {
    const contacto = await this.prisma.contact.findFirst({
      where: { id, deleted_at: null },
    });
    if (!contacto) {
      throw new NotFoundException({
        error: { code: 'CONTACTO_NO_ENCONTRADO', message: 'Contacto no encontrado' },
      });
    }
    return contacto;
  }

  async actualizar(id: number, dto: UpdateContactDto) {
    await this.obtener(id);

    if (dto.email) {
      const existe = await this.prisma.contact.findFirst({
        where: { email: dto.email, NOT: { id } },
      });
      if (existe) {
        throw new ConflictException({
          error: { code: 'EMAIL_DUPLICADO', message: 'El email ya está en uso' },
        });
      }
    }

    return this.prisma.contact.update({
      where: { id },
      data: {
        ...dto,
        attributes: dto.attributes
          ? (dto.attributes as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  async eliminar(id: number) {
    await this.obtener(id);
    await this.prisma.contact.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
