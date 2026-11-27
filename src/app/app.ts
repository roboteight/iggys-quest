import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SettingsService } from './settings.service';
import { UpdateService } from './update.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  styles: `
    .update { position: fixed; inset-inline: 0; bottom: 0; z-index: 50; display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
              gap: .5rem 1rem; padding: .75rem 1rem calc(.75rem + env(safe-area-inset-bottom)); background: var(--panel);
              border-top: 2px solid var(--accent); box-shadow: 0 -8px 30px rgb(0 0 0 / .5); animation: rise .25s ease-out; }
    .update p { margin: 0; }
    .update .btn { width: auto; }
    @keyframes rise { from { transform: translateY(100%); } }
    @media (prefers-reduced-motion: reduce) { .update { animation: none; } }
    .update.still { animation: none; }
    @media (forced-colors: active) { .update { border: 2px solid CanvasText; } }
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
    }
  `,
})
export class App {
  // Injected so saved settings (e.g. high contrast) apply on every page from startup.
  protected readonly settings = inject(SettingsService);
  protected readonly updates = inject(UpdateService);
  protected readonly showBanner = computed(() => this.updates.ready() && !this.updates.inGame() && !this.updates.dismissed());
}
