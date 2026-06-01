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
import { CreateContactUseCase } from './application/use-cases/create-contact.use-case';
import { ListContactsUseCase } from './application/use-cases/list-contacts.use-case';
import { UpdateContactUseCase } from './application/use-cases/update-contact.use-case';
import { DeleteContactUseCase } from './application/use-cases/delete-contact.use-case';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { QueryContactDto } from './dto/query-contact.dto';

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
  crear(@Body() dto: CreateContactDto) {
    return this.createUseCase.ejecutar(dto);
  }

  @Get()
  listar(@Query() query: QueryContactDto) {
    return this.listUseCase.ejecutar(query);
  }

  @Put(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContactDto,
  ) {
    return this.updateUseCase.ejecutar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    await this.deleteUseCase.ejecutar(id);
  }
}
