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
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { SaveCanvasDto } from './dto/save-canvas.dto';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @HttpCode(201)
  crear(@Body() dto: CreateCampaignDto) {
    return this.campaignsService.crear(dto);
  }

  @Get()
  listar() {
    return this.campaignsService.listar();
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.campaignsService.obtener(id);
  }

  @Put(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.actualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    await this.campaignsService.eliminar(id);
  }

  @Put(':id/canvas')
  guardarCanvas(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveCanvasDto,
  ) {
    return this.campaignsService.guardarCanvas(id, dto);
  }
}
