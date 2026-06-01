import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { FilterEngineModule } from './filter-engine/filter-engine.module';
import { ContactsModule } from './contacts/contacts.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { SegmentsModule } from './segments/segments.module';

@Module({
  imports: [
    PrismaModule,
    FilterEngineModule,
    ContactsModule,
    CampaignsModule,
    SegmentsModule,
  ],
})
export class AppModule {}
