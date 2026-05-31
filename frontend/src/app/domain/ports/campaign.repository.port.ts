import type { Campaign, Canvas, CreateCampaignPayload } from '../models/campaign.model';

export interface CampaignRepositoryPort {
  listar(): Promise<Campaign[]>;
  obtener(id: number): Promise<Campaign>;
  crear(payload: CreateCampaignPayload): Promise<Campaign>;
  actualizar(id: number, payload: Partial<CreateCampaignPayload>): Promise<Campaign>;
  eliminar(id: number): Promise<void>;
  guardarCanvas(id: number, canvas: Canvas): Promise<Campaign>;
}

export const CAMPAIGN_REPOSITORY_PORT = 'CAMPAIGN_REPOSITORY_PORT';
