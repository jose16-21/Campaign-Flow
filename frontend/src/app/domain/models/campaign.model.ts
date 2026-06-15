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
  created_at: string;
  canvas?: Canvas;
}

export interface Canvas {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export type NodeType = 'segment' | 'sms' | 'email' | 'whatsapp';

export const TIPOS_ACCION: NodeType[] = ['sms', 'email', 'whatsapp'];

export const ICONO_NODO: Record<NodeType, string> = {
  segment:  '⚙',
  sms:      '💬',
  email:    '✉',
  whatsapp: '📲',
};

export const LABEL_NODO: Record<NodeType, string> = {
  segment:  'Segmento',
  sms:      'SMS',
  email:    'Email',
  whatsapp: 'WhatsApp',
};

export interface CanvasNode {
  id: string;
  type: NodeType;
  name?: string;
  x: number;
  y: number;
  config: SegmentNodeConfig | SmsNodeConfig | EmailNodeConfig | WhatsappNodeConfig;
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

export type WhatsappTipo = 'texto' | 'template';

export interface WhatsappNodeConfig {
  tipo: WhatsappTipo;
  mensaje: string;
  templateNombre: string;
  templateParams: string[];
}

export interface CanvasEdge {
  source: string;
  target: string;
}

export interface CreateCampaignPayload {
  name: string;
  description?: string;
  status?: CampaignStatus;
  locale?: string;
}
