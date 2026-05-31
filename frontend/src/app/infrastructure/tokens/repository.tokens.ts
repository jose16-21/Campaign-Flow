import { InjectionToken } from '@angular/core';
import type { ContactRepositoryPort } from '../../domain/ports/contact.repository.port';
import type { CampaignRepositoryPort } from '../../domain/ports/campaign.repository.port';
import type { SegmentRepositoryPort } from '../../domain/ports/segment.repository.port';

export const CONTACT_REPOSITORY = new InjectionToken<ContactRepositoryPort>(
  'ContactRepository',
);

export const CAMPAIGN_REPOSITORY = new InjectionToken<CampaignRepositoryPort>(
  'CampaignRepository',
);

export const SEGMENT_REPOSITORY = new InjectionToken<SegmentRepositoryPort>(
  'SegmentRepository',
);
