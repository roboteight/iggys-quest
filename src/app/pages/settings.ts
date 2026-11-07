import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SettingsService } from '../settings.service';
import { ProgressService } from '../progress.service';
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
    input[type='text'] { font: inherit; min-height: 44px; padding: 0 .75rem; width: 100%; color: var(--fg); background: var(--bg); border: 2px solid var(--border); border-radius: 10px; }
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

      <fieldset>
        <legend>Player</legend>
        <label for="name">Name on the high-score table</label>
        <input id="name" type="text" maxlength="12" autocomplete="off" [value]="s().playerName"
               (input)="svc.update({ playerName: $any($event.target).value })" />
      </fieldset>

      <fieldset>
        <legend>Saved progress</legend>
        <p class="hint">Cleared levels and high scores are saved in this browser only.</p>
        @if (!confirmReset()) {
          <button class="btn" type="button" (click)="confirmReset.set(true)">Reset progress…</button>
        } @else {
          <p role="alert" class="hint">This deletes all cleared levels and high scores. It cannot be undone.</p>
          <button class="btn" type="button" (click)="reset()">Yes, delete my progress</button>
          <button class="btn" type="button" (click)="confirmReset.set(false)">Keep it</button>
        }
      </fieldset>

      <a class="btn" routerLink="/" style="max-width:24rem">Back to menu</a>
    </main>
  `,
})
export class SettingsPage {
  protected readonly svc = inject(SettingsService);
  protected readonly s = this.svc.settings;
  private readonly progress = inject(ProgressService);
  protected readonly confirmReset = signal(false);
  protected reset() {
    this.progress.reset();
    this.confirmReset.set(false);
  }
}
