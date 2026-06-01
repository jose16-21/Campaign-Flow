import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'campaigns', pathMatch: 'full' },
  {
    path: 'campaigns',
    loadComponent: () =>
      import('./features/campaigns/campaign-list/campaign-list.component').then(
        (m) => m.CampaignListComponent,
      ),
  },
  {
    path: 'campaigns/:id',
    loadComponent: () =>
      import('./features/campaigns/campaign-editor/campaign-editor.component').then(
        (m) => m.CampaignEditorComponent,
      ),
  },
  {
    path: 'contacts',
    loadComponent: () =>
      import('./features/contacts/contact-list/contact-list.component').then(
        (m) => m.ContactListComponent,
      ),
  },
];
