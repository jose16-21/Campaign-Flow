import type {
  Contact,
  ContactsPage,
  ContactsQuery,
  CreateContactPayload,
} from '../models/contact.model';

export interface ContactRepositoryPort {
  listar(query: ContactsQuery): Promise<ContactsPage>;
  obtener(id: number): Promise<Contact>;
  crear(payload: CreateContactPayload): Promise<Contact>;
  actualizar(id: number, payload: Partial<CreateContactPayload>): Promise<Contact>;
  eliminar(id: number): Promise<void>;
}

export const CONTACT_REPOSITORY_PORT = 'CONTACT_REPOSITORY_PORT';
