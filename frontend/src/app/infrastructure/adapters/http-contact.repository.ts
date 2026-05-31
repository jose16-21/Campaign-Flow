import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ContactRepositoryPort } from '../../domain/ports/contact.repository.port';
import type {
  Contact,
  ContactsPage,
  ContactsQuery,
  CreateContactPayload,
} from '../../domain/models/contact.model';

@Injectable({ providedIn: 'root' })
export class HttpContactRepository implements ContactRepositoryPort {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/contacts`;

  listar(query: ContactsQuery): Promise<ContactsPage> {
    let params = new HttpParams()
      .set('page', String(query.page ?? 1))
      .set('pageSize', String(query.pageSize ?? 20));

    if (query.search) params = params.set('search', query.search);
    if (query.filters) params = params.set('filters', JSON.stringify(query.filters));

    return firstValueFrom(this.http.get<ContactsPage>(this.base, { params }));
  }

  obtener(id: number): Promise<Contact> {
    return firstValueFrom(this.http.get<Contact>(`${this.base}/${id}`));
  }

  crear(payload: CreateContactPayload): Promise<Contact> {
    return firstValueFrom(this.http.post<Contact>(this.base, payload));
  }

  actualizar(id: number, payload: Partial<CreateContactPayload>): Promise<Contact> {
    return firstValueFrom(this.http.put<Contact>(`${this.base}/${id}`, payload));
  }

  eliminar(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/${id}`));
  }
}
