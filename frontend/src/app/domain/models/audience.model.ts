import type { Contact } from './contact.model';

export interface AudienceResult {
  nodeId: string;
  total: number;
  contactos: Contact[];
}
