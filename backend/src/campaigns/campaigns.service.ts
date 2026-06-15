import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { SaveCanvasDto } from './dto/save-canvas.dto';
import { Prisma } from '@prisma/client';
import { FilterEngineService } from '../filter-engine/application/filter-engine.service';

const INTEGRATION_URL = process.env['INTEGRATION_URL'] ?? 'http://localhost:51198/api/integration-services';

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filterEngine: FilterEngineService,
  ) {}

  crear(dto: CreateCampaignDto) {
    return this.prisma.campaign.create({ data: dto });
  }

  listar() {
    return this.prisma.campaign.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        locale: true,
        owner_id: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async obtener(id: number) {
    const campaña = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaña) {
      throw new NotFoundException({
        error: { code: 'CAMPAÑA_NO_ENCONTRADA', message: 'Campaña no encontrada' },
      });
    }
    return campaña;
  }

  async actualizar(id: number, dto: UpdateCampaignDto) {
    await this.obtener(id);
    return this.prisma.campaign.update({ where: { id }, data: dto });
  }

  async eliminar(id: number) {
    await this.obtener(id);
    await this.prisma.campaign.delete({ where: { id } });
  }

  async activar(id: number) {
    const campaign = await this.obtener(id);
    const canvas = campaign.canvas as { nodes: any[]; edges: any[] };

    // Resolver audiencia a partir del primer nodo segmento
    const segmento = canvas.nodes?.find((n: any) => n.type === 'segment');
    const resultado = segmento?.config?.filters
      ? await this.filterEngine.resolverAudiencia(segmento.config.filters)
      : null;
    const contactos = resultado?.contactos ?? [];

    // Llamar a ms-chat-integration-services (fetch nativo Node 18+)
    const res = await fetch(`${INTEGRATION_URL}/campaign/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: campaign.id,
        ownerId: campaign.owner_id,
        locale: campaign.locale,
        canvas,
        audiencia: contactos.map((c) => ({
          phone: (c['phone'] as string) ?? (c['email'] as string),
          name: `${c['first_name'] ?? ''} ${c['last_name'] ?? ''}`.trim(),
          ...c,
        })),
      }),
    });

    const respuestaIntegracion = await res.json() as Record<string, unknown>;

    // Marcar como activa
    await this.prisma.campaign.update({ where: { id }, data: { status: 'ACTIVE' } });

    return { campaign: { id: campaign.id, status: 'ACTIVE' }, integracion: respuestaIntegracion };
  }

  async guardarCanvas(id: number, dto: SaveCanvasDto) {
    await this.obtener(id);
    return this.prisma.$transaction(async (tx) => {
      return tx.campaign.update({
        where: { id },
        data: { canvas: dto as unknown as Prisma.InputJsonValue },
      });
    });
  }
}
