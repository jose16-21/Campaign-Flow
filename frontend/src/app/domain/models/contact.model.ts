export type ContactStatus = 'ACTIVE' | 'INACTIVE';

export interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  country?: string;
  city?: string;
  status: ContactStatus;
  attributes: Record<string, unknown>;
  created_at: string;
}

export interface CreateContactPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  country?: string;
  city?: string;
  status?: ContactStatus;
  attributes?: Record<string, unknown>;
}

export interface ContactsPage {
  data: Contact[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ContactsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  filters?: FilterGroup;
}

import type { FilterGroup } from './filter-tree.model';
