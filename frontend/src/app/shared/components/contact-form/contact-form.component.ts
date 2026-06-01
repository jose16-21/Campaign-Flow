import { Component, input, output, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Contact, CreateContactPayload, ContactStatus } from '../../../domain/models/contact.model';

@Component({
  selector: 'app-contact-form',
  imports: [FormsModule],
  templateUrl: './contact-form.component.html',
  styleUrl: './contact-form.component.scss',
})
export class ContactFormComponent implements OnInit {
  readonly contacto = input<Contact | null>(null);
  readonly guardando = input(false);
  readonly confirmar = output<CreateContactPayload>();
  readonly cancelar = output<void>();

  readonly form = signal<CreateContactPayload>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    status: 'ACTIVE',
  });

  get titulo(): string {
    return this.contacto() ? 'Editar contacto' : 'Nuevo contacto';
  }

  get esEdicion(): boolean {
    return !!this.contacto();
  }

  ngOnInit(): void {
    const c = this.contacto();
    if (c) {
      this.form.set({
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email,
        phone: c.phone ?? '',
        country: c.country ?? '',
        city: c.city ?? '',
        status: c.status,
      });
    }
  }

  set(campo: keyof CreateContactPayload, valor: string): void {
    this.form.update(f => ({ ...f, [campo]: valor }));
  }

  onSubmit(): void {
    const f = this.form();
    if (!f.first_name.trim() || !f.last_name.trim() || !f.email.trim()) return;
    this.confirmar.emit({
      ...f,
      first_name: f.first_name.trim(),
      last_name: f.last_name.trim(),
      email: f.email.trim(),
      phone: f.phone?.trim() || undefined,
      country: f.country?.trim() || undefined,
      city: f.city?.trim() || undefined,
    });
  }

  get invalido(): boolean {
    const f = this.form();
    return !f.first_name.trim() || !f.last_name.trim() || !f.email.trim();
  }
}
