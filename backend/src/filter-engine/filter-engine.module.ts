import { Module } from '@nestjs/common';
import { FilterEngineService } from './application/filter-engine.service';
import { MysqlAudienceResolver } from './infrastructure/mysql-audience-resolver';
import { AUDIENCE_RESOLVER_PORT } from './domain/audience-resolver.port';

@Module({
  providers: [
    { provide: AUDIENCE_RESOLVER_PORT, useClass: MysqlAudienceResolver },
    FilterEngineService,
  ],
  exports: [FilterEngineService],
})
export class FilterEngineModule {}
