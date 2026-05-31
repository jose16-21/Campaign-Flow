import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { FilterEngineModule } from '../filter-engine/filter-engine.module';

@Module({
  imports: [FilterEngineModule],
  controllers: [ContactsController],
  providers: [ContactsService],
})
export class ContactsModule {}
