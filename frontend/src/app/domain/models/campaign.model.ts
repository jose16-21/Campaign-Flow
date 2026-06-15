import type { FilterGroup } from './filter-tree.model';

export type CampaignStatus = 'DRAFT' | 'ACTIVE';

export interface Campaign {
  id: number;
  name: string;
  description?: string;
  status: CampaignStatus;
  created_at: string;
  canvas?: Canvas;
}

export interface Canvas {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export type NodeType = 'segment' | 'sms' | 'email';

export const TIPOS_ACCION: NodeType[] = ['sms', 'email'];

export interface CanvasNode {
  id: string;
  type: NodeType;
  name?: string;
  x: number;
  y: number;
  config: SegmentNodeConfig | SmsNodeConfig | EmailNodeConfig;
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

export interface CanvasEdge {
  source: string;
  target: string;
}

export interface CreateCampaignPayload {
  name: string;
  description?: string;
  status?: CampaignStatus;
}
