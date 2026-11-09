import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, Routes } from '@angular/router';
import { levelById } from './game/levels';
import { ProgressService } from './progress.service';
import { dailyLevel } from './daily';

/** A level opens once the one before it is cleared. Add ?unlock=1 to the address to open any level (handy for testing). */
const levelOpen: CanActivateFn = (route: ActivatedRouteSnapshot) =>
  route.queryParamMap.has('unlock') || route.queryParamMap.has('daily') || inject(ProgressService).unlocked(levelById(route.params['level']).id) || inject(Router).createUrlTree(['/'])

export const routes: Routes = [
  { path: '', title: 'Iggy’s Quest', loadComponent: () => import('./pages/menu').then((m) => m.MenuPage) },
  { path: 'play/:level', canActivate: [levelOpen], title: 'Play – Iggy’s Quest', loadComponent: () => import('./pages/play').then((m) => m.PlayPage) },
  { path: 'daily', canActivate: [() => inject(Router).createUrlTree(['/play', dailyLevel().id], { queryParams: { daily: 1 } })], children: [] },
  { path: 'play', title: 'Play – Iggy’s Quest', loadComponent: () => import('./pages/play').then((m) => m.PlayPage) },
  { path: 'settings', title: 'Settings – Iggy’s Quest', loadComponent: () => import('./pages/settings').then((m) => m.SettingsPage) },
  { path: 'scores', title: 'High scores – Iggy’s Quest', loadComponent: () => import('./pages/scores').then((m) => m.ScoresPage) },
  { path: '**', redirectTo: '' },
];
