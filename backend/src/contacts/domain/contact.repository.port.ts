import type { Contact, Prisma } from '@prisma/client';

export interface ListarContactosQuery {
  page: number;
  pageSize: number;
  search?: string;
}

export interface PaginatedContacts {
  data: Contact[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ContactRepositoryPort {
  crear(data: Prisma.ContactCreateInput): Promise<Contact>;
  listar(query: ListarContactosQuery): Promise<PaginatedContacts>;
  obtenerPorId(id: number): Promise<Contact | null>;
  obtenerPorEmail(email: string): Promise<Contact | null>;
  actualizar(id: number, data: Prisma.ContactUpdateInput): Promise<Contact>;
  softDelete(id: number): Promise<void>;
}

export const CONTACT_REPOSITORY_PORT = 'CONTACT_REPOSITORY_PORT';
