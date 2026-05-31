import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { GlobalErrorHandler } from './core/error-handler';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { routes } from './app.routes';
import { CONTACT_REPOSITORY, CAMPAIGN_REPOSITORY, SEGMENT_REPOSITORY } from './infrastructure/tokens/repository.tokens';
import { HttpContactRepository } from './infrastructure/adapters/http-contact.repository';
import { HttpCampaignRepository } from './infrastructure/adapters/http-campaign.repository';
import { HttpSegmentRepository } from './infrastructure/adapters/http-segment.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    { provide: CONTACT_REPOSITORY, useClass: HttpContactRepository },
    { provide: CAMPAIGN_REPOSITORY, useClass: HttpCampaignRepository },
    { provide: SEGMENT_REPOSITORY, useClass: HttpSegmentRepository },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
