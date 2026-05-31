import { Module } from '@nestjs/common';
import { SegmentsController } from './segments.controller';
import { SegmentsService } from './segments.service';
import { FilterEngineModule } from '../filter-engine/filter-engine.module';

@Module({
  imports: [FilterEngineModule],
  controllers: [SegmentsController],
  providers: [SegmentsService],
})
export class SegmentsModule {}
