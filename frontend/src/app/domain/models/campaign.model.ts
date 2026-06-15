import type { FilterGroup } from './filter-tree.model';

export type CampaignStatus = 'DRAFT' | 'ACTIVE';

export const LOCALES_DISPONIBLES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
] as const;

export interface Campaign {
  id: number;
  name: string;
  description?: string;
  status: CampaignStatus;
  locale: string;
  owner_id: string;
  created_at: string;
  canvas?: Canvas;
}

export interface CanvasGroup {
  id: string;
  title: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Canvas {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  groups?: CanvasGroup[];
}

export type NodeType = 'segment' | 'sms' | 'email' | 'whatsapp' | 'annotation';

export const TIPOS_ACCION: NodeType[] = ['sms', 'email', 'whatsapp'];

export const ICONO_NODO: Record<NodeType, string> = {
  segment:    '⚙',
  sms:        '💬',
  email:      '✉',
  whatsapp:   '📲',
  annotation: '📝',
};

export const LABEL_NODO: Record<NodeType, string> = {
  segment:    'Segmento',
  sms:        'SMS',
  email:      'Email',
  whatsapp:   'WhatsApp',
  annotation: 'Nota',
};

export interface CanvasNode {
  id: string;
  type: NodeType;
  name?: string;
  x: number;
  y: number;
  config: AnnotationNodeConfig | SegmentNodeConfig | SmsNodeConfig | EmailNodeConfig | WhatsappNodeConfig;
}

export interface AnnotationNodeConfig {
  text: string;
  color: string;
}

export interface SegmentNodeConfig {
  filters: FilterGroup | null;
}

export interface SmsNodeConfig {
  message: string;
}

export interface EmailNodeConfig {
  subject: string;
  body: string;
}

export type WhatsappTipo = 'texto' | 'template' | 'botones' | 'lista' | 'media' | 'ticket' | 'condicion';

export interface WhatsappBoton {
  id: string;
  texto: string;
}

export interface WhatsappOpcion {
  id: string;
  titulo: string;
  descripcion?: string;
}

export interface WhatsappSeccion {
  titulo: string;
  opciones: WhatsappOpcion[];
}

export interface WhatsappNodeConfig {
  tipo: WhatsappTipo;
  // texto / template / media
  mensaje?: string;
  templateNombre?: string;
  templateParams?: string[];
  // botones (hasta 3 — cada uno es un puerto de salida en el canvas)
  botones?: WhatsappBoton[];
  // lista (cada opción es un puerto de salida)
  headerTexto?: string;
  bodyTexto?: string;
  footerTexto?: string;
  botonLista?: string;
  secciones?: WhatsappSeccion[];
  // media
  mediaUrl?: string;
  mediaCaption?: string;
  mediaType?: 'image' | 'video' | 'document';
  // ticket (nodo terminal — sin salida)
  ticketTipo?: 'venta' | 'soporte';
  mensajeFinal?: string;
  // condicion (bifurcación sí/no)
  condicionCampo?: string;
  condicionOperador?: 'eq' | 'ne' | 'contains' | 'gt' | 'lt';
  condicionValor?: string;
}

export interface CanvasEdge {
  source: string;
  target: string;
  condicion?: string;
  etiqueta?: string;
  auto?: boolean;  // true = generada desde config WP, no dibujada manualmente
}

export interface CreateCampaignPayload {
  name: string;
  description?: string;
  status?: CampaignStatus;
  locale?: string;
  owner_id?: string;
}
