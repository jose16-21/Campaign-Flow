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
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { QueryContactDto } from './dto/query-contact.dto';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @HttpCode(201)
  crear(@Body() dto: CreateContactDto) {
    return this.contactsService.crear(dto);
  }

  @Get()
  listar(@Query() query: QueryContactDto) {
    return this.contactsService.listar(query);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.contactsService.obtener(id);
  }

  @Put(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.actualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    await this.contactsService.eliminar(id);
  }
}
