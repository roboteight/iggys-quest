import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AnalyticsService } from './analytics.service';
import { SettingsService } from './settings.service';
import { UpdateService } from './update.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  styles: `
    .update, .consent { position: fixed; inset-inline: 0; bottom: 0; z-index: 50; display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
              gap: .5rem 1rem; padding: .75rem 1rem calc(.75rem + env(safe-area-inset-bottom)); background: var(--panel);
              border-top: 2px solid var(--accent); box-shadow: 0 -8px 30px rgb(0 0 0 / .5); animation: rise .25s ease-out; }
    .update p, .consent p { margin: 0; }
    .update .btn, .consent .btn { width: auto; }
    .consent p { flex: 1 1 22rem; max-width: 40rem; }
    .consent a { color: var(--fg); }
    @keyframes rise { from { transform: translateY(100%); } }
    @media (prefers-reduced-motion: reduce) { .update, .consent { animation: none; } }
    .still { animation: none; }
    @media (forced-colors: active) { .update, .consent { border: 2px solid CanvasText; } }
  `,
  template: `
    <router-outlet />
    <!-- Always in the page, so screen readers hear the message when it appears. -->
    <p class="visually-hidden" role="status">{{ showBanner() ? 'A new version of Iggy’s Quest is ready. Reload to update.' : '' }}</p>
    @if (showBanner()) {
      <aside class="update" [class.still]="settings.settings().reducedMotion" aria-labelledby="update-msg">
        <p id="update-msg">A new version of Iggy’s Quest is ready.</p>
        <button class="btn primary" type="button" (click)="updates.reload()">Reload</button>
        <button class="btn" type="button" (click)="updates.dismissed.set(true)">Later</button>
      </aside>
    } @else if (showConsent()) {
      <!-- Not modal and never takes focus: until the player answers, nothing is tracked. -->
      <section class="consent" [class.still]="settings.settings().reducedMotion" aria-labelledby="consent-title">
        <h2 id="consent-title" class="visually-hidden">Analytics cookies</h2>
        <p>Can we count visits with Google Analytics? It uses cookies to show us which levels people play. No ads, and you can change this any time in <a routerLink="/settings">Settings</a>.</p>
        <button class="btn primary" type="button" (click)="analytics.set('granted')">Allow</button>
        <button class="btn" type="button" (click)="analytics.set('denied')">No thanks</button>
      </section>
    }
  `,
})
export class App {
  // Injected so saved settings (e.g. high contrast) apply on every page from startup.
  protected readonly settings = inject(SettingsService);
  protected readonly updates = inject(UpdateService);
  protected readonly analytics = inject(AnalyticsService);
  protected readonly showConsent = computed(() => this.analytics.available && this.analytics.consent() === null && !this.updates.inGame());
  protected readonly showBanner = computed(() => this.updates.ready() && !this.updates.inGame() && !this.updates.dismissed());
}
