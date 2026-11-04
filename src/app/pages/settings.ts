import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SettingsService } from '../settings.service';
import { FocusOnLoad } from './focus-heading';

@Component({
  selector: 'app-settings',
  imports: [RouterLink, FocusOnLoad],
  styles: `
    main { max-width: 34rem; }
    fieldset { border: 2px solid var(--border); border-radius: 14px; background: var(--panel); padding: 1rem 1.25rem; margin: 0; width: 100%; text-align: left; }
    legend { padding: 0 .5rem; }
    label { display: flex; align-items: center; gap: .75rem; min-height: 44px; }
    input[type='checkbox'] { width: 1.5rem; height: 1.5rem; accent-color: var(--accent); }
    input[type='range'] { width: 100%; accent-color: var(--accent); }
    .hint { margin: 0; font-size: .9rem; opacity: .85; }
  `,
  template: `
    <main class="page">
      <h1 tabindex="-1" appFocusOnLoad>Settings</h1>
      <p class="hint">Changes save automatically.</p>

      <fieldset>
        <legend>Sound</legend>
        <label for="volume">Sound effects volume: {{ s().volume }}%</label>
        <input id="volume" type="range" min="0" max="100" step="5" [value]="s().volume"
               (input)="svc.update({ volume: +$any($event.target).value })" />
        <label><input type="checkbox" [checked]="s().musicOn"
                      (change)="svc.update({ musicOn: $any($event.target).checked })" /> Play music</label>
        <label for="music-volume">Music volume: {{ s().musicVolume }}%</label>
        <input id="music-volume" type="range" min="0" max="100" step="5" [value]="s().musicVolume"
               (input)="svc.update({ musicVolume: +$any($event.target).value })" />
      </fieldset>

      <fieldset>
        <legend>Display</legend>
        <label><input type="checkbox" [checked]="s().reducedMotion"
                      (change)="svc.update({ reducedMotion: $any($event.target).checked })" /> Reduce motion</label>
        <label><input type="checkbox" [checked]="s().highContrast"
                      (change)="svc.update({ highContrast: $any($event.target).checked })" /> High contrast</label>
      </fieldset>

      <a class="btn" routerLink="/" style="max-width:24rem">Back to menu</a>
    </main>
  `,
})
export class SettingsPage {
  protected readonly svc = inject(SettingsService);
  protected readonly s = this.svc.settings;
}
