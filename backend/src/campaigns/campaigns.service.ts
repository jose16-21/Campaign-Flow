import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { SaveCanvasDto } from './dto/save-canvas.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

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
