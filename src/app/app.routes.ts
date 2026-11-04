import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', title: 'Iggy’s Quest', loadComponent: () => import('./pages/menu').then((m) => m.MenuPage) },
  { path: 'play/:level', title: 'Play – Iggy’s Quest', loadComponent: () => import('./pages/play').then((m) => m.PlayPage) },
  { path: 'play', title: 'Play – Iggy’s Quest', loadComponent: () => import('./pages/play').then((m) => m.PlayPage) },
  { path: 'settings', title: 'Settings – Iggy’s Quest', loadComponent: () => import('./pages/settings').then((m) => m.SettingsPage) },
  { path: '**', redirectTo: '' },
];
