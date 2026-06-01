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
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { CreateContactUseCase } from './application/use-cases/create-contact.use-case';
import { ListContactsUseCase } from './application/use-cases/list-contacts.use-case';
import { UpdateContactUseCase } from './application/use-cases/update-contact.use-case';
import { DeleteContactUseCase } from './application/use-cases/delete-contact.use-case';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { QueryContactDto } from './dto/query-contact.dto';

@ApiTags('Contactos')
@Controller('contacts')
export class ContactsController {
  constructor(
    private readonly createUseCase: CreateContactUseCase,
    private readonly listUseCase: ListContactsUseCase,
    private readonly updateUseCase: UpdateContactUseCase,
    private readonly deleteUseCase: DeleteContactUseCase,
  ) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Crear contacto', description: 'Crea un nuevo contacto. Retorna 409 si el email ya existe.' })
  @ApiResponse({ status: 201, description: 'Contacto creado' })
  @ApiResponse({ status: 400, description: 'Validación fallida — campos requeridos vacíos o email inválido' })
  @ApiResponse({ status: 409, description: 'Email duplicado' })
  crear(@Body() dto: CreateContactDto) {
    return this.createUseCase.ejecutar(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar contactos', description: 'Paginación, búsqueda por texto y filtros dinámicos AND/OR.' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Buscar en nombre y email' })
  @ApiQuery({ name: 'filters', required: false, type: String, description: 'Árbol de filtros AND/OR serializado en JSON' })
  @ApiResponse({ status: 200, description: '{ data, page, pageSize, total }' })
  listar(@Query() query: QueryContactDto) {
    return this.listUseCase.ejecutar(query);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar contacto' })
  @ApiResponse({ status: 200, description: 'Contacto actualizado' })
  @ApiResponse({ status: 404, description: 'Contacto no encontrado' })
  @ApiResponse({ status: 409, description: 'Email duplicado' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContactDto,
  ) {
    return this.updateUseCase.ejecutar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar contacto (soft delete)', description: 'Marca el contacto como eliminado sin borrarlo de la base de datos.' })
  @ApiResponse({ status: 204, description: 'Contacto eliminado (soft delete)' })
  @ApiResponse({ status: 404, description: 'Contacto no encontrado' })
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    await this.deleteUseCase.ejecutar(id);
  }
}
