import { Module } from '@nestjs/common';
import { ContactsController } from './contacts.controller';
import { PrismaContactRepository } from './infrastructure/prisma-contact.repository';
import { CONTACT_REPOSITORY_PORT } from './domain/contact.repository.port';
import { CreateContactUseCase } from './application/use-cases/create-contact.use-case';
import { ListContactsUseCase } from './application/use-cases/list-contacts.use-case';
import { UpdateContactUseCase } from './application/use-cases/update-contact.use-case';
import { DeleteContactUseCase } from './application/use-cases/delete-contact.use-case';
import { FilterEngineModule } from '../filter-engine/filter-engine.module';

@Module({
  imports: [FilterEngineModule],
  controllers: [ContactsController],
  providers: [
    { provide: CONTACT_REPOSITORY_PORT, useClass: PrismaContactRepository },
    CreateContactUseCase,
    ListContactsUseCase,
    UpdateContactUseCase,
    DeleteContactUseCase,
  ],
})
export class ContactsModule {}
