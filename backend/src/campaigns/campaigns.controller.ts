import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { SaveCanvasDto } from './dto/save-canvas.dto';

@ApiTags('Campañas')
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Crear campaña', description: 'Crea una nueva campaña con canvas vacío.' })
  @ApiResponse({ status: 201, description: 'Campaña creada' })
  crear(@Body() dto: CreateCampaignDto) {
    return this.campaignsService.crear(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar campañas', description: 'Retorna todas las campañas sin incluir el canvas (para reducir payload).' })
  @ApiResponse({ status: 200, description: 'Lista de campañas' })
  listar() {
    return this.campaignsService.listar();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener campaña con canvas', description: 'Retorna la campaña incluyendo el canvas completo (nodes + edges).' })
  @ApiResponse({ status: 200, description: 'Campaña con canvas' })
  @ApiResponse({ status: 404, description: 'Campaña no encontrada' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.campaignsService.obtener(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar campaña' })
  @ApiResponse({ status: 200, description: 'Campaña actualizada' })
  @ApiResponse({ status: 404, description: 'Campaña no encontrada' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.actualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar campaña' })
  @ApiResponse({ status: 204, description: 'Campaña eliminada' })
  @ApiResponse({ status: 404, description: 'Campaña no encontrada' })
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    await this.campaignsService.eliminar(id);
  }

  @Put(':id/canvas')
  @ApiTags('Canvas')
  @ApiOperation({
    summary: 'Guardar canvas (transacción atómica)',
    description: 'Persiste el canvas completo (nodos + conexiones) en una transacción. El canvas anterior se reemplaza completamente.',
  })
  @ApiResponse({ status: 200, description: 'Canvas guardado. Retorna la campaña con el canvas actualizado.' })
  @ApiResponse({ status: 400, description: 'Nodos o aristas con campos inválidos' })
  @ApiResponse({ status: 404, description: 'Campaña no encontrada' })
  guardarCanvas(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveCanvasDto,
  ) {
    return this.campaignsService.guardarCanvas(id, dto);
  }
}
