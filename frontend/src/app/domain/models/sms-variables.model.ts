import type { Contact } from './contact.model';

export interface SmsVariable {
  token: string;       // Ej: "{{name}}"
  campo: string;       // Ej: "name"
  etiqueta: string;    // Ej: "Nombre"
  ejemplo: string;     // Valor de ejemplo si no hay contacto
}

export const SMS_VARIABLES: SmsVariable[] = [
  { token: '{{name}}',       campo: 'first_name',  etiqueta: 'Nombre',          ejemplo: 'Juan'     },
  { token: '{{last_name}}',  campo: 'last_name',   etiqueta: 'Apellido',         ejemplo: 'Pérez'    },
  { token: '{{email}}',      campo: 'email',       etiqueta: 'Email',            ejemplo: 'juan@test.com' },
  { token: '{{phone}}',      campo: 'phone',       etiqueta: 'Teléfono',         ejemplo: '+502 5555 5555' },
  { token: '{{country}}',    campo: 'country',     etiqueta: 'País',             ejemplo: 'GT'       },
  { token: '{{city}}',       campo: 'city',        etiqueta: 'Ciudad',           ejemplo: 'Guatemala' },
  { token: '{{plan}}',       campo: 'attributes.plan', etiqueta: 'Plan',         ejemplo: 'premium'  },
  { token: '{{age}}',        campo: 'attributes.age',  etiqueta: 'Edad',         ejemplo: '30'       },
];

/**
 * Resuelve las variables {{campo}} en un mensaje usando los datos de un contacto.
 * Variables desconocidas se dejan como texto literal (sanitización implícita).
 */
export function resolverVariables(mensaje: string, contacto: Contact): string {
  return SMS_VARIABLES.reduce((msg, variable) => {
    const valor = obtenerValorCampo(contacto, variable.campo);
    return msg.replaceAll(variable.token, valor ?? variable.token);
  }, mensaje);
}

export function resolverVariablesEjemplo(mensaje: string): string {
  return SMS_VARIABLES.reduce((msg, variable) => {
    return msg.replaceAll(variable.token, variable.ejemplo);
  }, mensaje);
}

function obtenerValorCampo(contacto: Contact, campo: string): string | null {
  if (campo.startsWith('attributes.')) {
    const clave = campo.slice('attributes.'.length);
    const val = (contacto.attributes as Record<string, unknown>)?.[clave];
    return val !== undefined ? String(val) : null;
  }
  const val = (contacto as unknown as Record<string, unknown>)[campo];
  return val !== undefined && val !== null ? String(val) : null;
}
