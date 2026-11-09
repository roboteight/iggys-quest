import { Component, ElementRef, HostListener, inject, input, signal, viewChildren } from '@angular/core';
import { ACTIONS, Action, RESERVED_KEYS, SettingsService, keyLabel, keySpoken } from '../settings.service';

/** Sound, display, assist and controls options. Used on the Settings page and inside the pause menu. */
@Component({
  selector: 'app-options',
  styles: `
    :host { display: contents; }
    fieldset { border: 2px solid var(--border); border-radius: 14px; background: var(--panel); padding: 1rem 1.25rem; margin: 0 0 1rem; width: 100%; text-align: left; box-sizing: border-box; }
    legend { padding: 0 .5rem; }
    label { display: flex; align-items: center; gap: .75rem; min-height: 44px; }
    input[type='checkbox'], input[type='radio'] { width: 1.5rem; height: 1.5rem; accent-color: var(--accent); flex: none; }
    input[type='range'] { width: 100%; accent-color: var(--accent); }
    select { font: inherit; min-height: 44px; padding: 0 .5rem; color: var(--fg); background: var(--bg); border: 2px solid var(--border); border-radius: 10px; }
    .hint { margin: .25rem 0 .5rem; font-size: .9rem; opacity: .85; }
    .keys { list-style: none; margin: 0; padding: 0; display: grid; gap: .5rem; }
    .keys li { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; border-top: 1px solid var(--border); padding-top: .5rem; }
    .keys li:first-child { border-top: 0; padding-top: 0; }
    .keys .name { flex: 0 0 7rem; font-weight: 600; }
    .chip { display: inline-flex; align-items: center; gap: .25rem; border: 2px solid var(--border); border-radius: 10px; padding: 0 0 0 .6rem; min-height: 40px; background: var(--bg); }
    .chip kbd { font: inherit; font-weight: 700; }
    .chip button, .small { font: inherit; min-height: 40px; min-width: 40px; padding: 0 .6rem; color: var(--fg); background: transparent; border: 0; border-left: 2px solid var(--border); cursor: pointer; border-radius: 0 8px 8px 0; }
    .small { border: 2px solid var(--border); border-radius: 10px; background: var(--bg); }
    .chip button:disabled { opacity: .45; cursor: not-allowed; }
    .listening { border-color: var(--accent); }
    .status { min-height: 1.5rem; margin: .5rem 0 0; font-weight: 600; }
    @media (forced-colors: active) { .chip, .small { border-color: ButtonText; } }
  `,
  template: `
    <fieldset>
      <legend>Sound</legend>
      <label for="volume">Sound effects volume: {{ s().volume }}%</label>
      <input id="volume" type="range" min="0" max="100" step="5" [value]="s().volume" (input)="svc.update({ volume: +$any($event.target).value })" />
      <label><input type="checkbox" [checked]="s().musicOn" (change)="svc.update({ musicOn: $any($event.target).checked })" /> Play music</label>
      <label for="music-volume">Music volume: {{ s().musicVolume }}%</label>
      <input id="music-volume" type="range" min="0" max="100" step="5" [value]="s().musicVolume" (input)="svc.update({ musicVolume: +$any($event.target).value })" />
    </fieldset>

    @if (showDisplay()) {
      <fieldset>
        <legend>Display</legend>
        <label><input type="checkbox" [checked]="s().reducedMotion" (change)="svc.update({ reducedMotion: $any($event.target).checked })" /> Reduce motion</label>
        <label><input type="checkbox" [checked]="s().highContrast" (change)="svc.update({ highContrast: $any($event.target).checked })" /> High contrast</label>
        <label><input type="checkbox" [checked]="s().storyCards" (change)="svc.update({ storyCards: $any($event.target).checked })" /> Show story cards before levels</label>
        <p class="hint">Reduce motion and high contrast reach the game the next time a level starts.</p>
      </fieldset>
    }

    <fieldset>
      <legend>Assist options</legend>
      <p class="hint">Make the game gentler. Your score is not changed, and every level can still be cleared and perfected.</p>
      <label for="lives">Starting lives
        <select id="lives" (change)="svc.update({ startLives: +$any($event.target).value })">
          @for (n of [3, 5, 7, 9]; track n) { <option [value]="n" [selected]="s().startLives === n">{{ n }}</option> }
        </select>
      </label>
      <p class="hint" style="margin:0">Also the number of lives you get back at each checkpoint. A new number applies from the next checkpoint or restart.</p>
      <fieldset class="inner" style="border:0;padding:0;margin:.5rem 0 0">
        <legend style="padding:0">Enemy speed</legend>
        @for (o of speeds; track o.value) {
          <label><input type="radio" name="enemy-speed" [value]="o.value" [checked]="s().enemySpeed === o.value" (change)="svc.update({ enemySpeed: o.value })" /> {{ o.label }}</label>
        }
        <p class="hint" style="margin:0">Applies to skeletons, crawlers, flying enemies, bosses and their shots.</p>
      </fieldset>
      <label><input type="checkbox" [checked]="s().longGrace" (change)="svc.update({ longGrace: $any($event.target).checked })" /> Stay protected for longer after a hit</label>
    </fieldset>

    <fieldset>
      <legend>Controls</legend>
      <p class="hint">Every action can have several keys. Choose “Add key”, then press the key you want; Esc cancels. A key can do only one thing, and each action keeps at least one key. Esc (pause), Tab and Enter can’t be changed.</p>
      <ul class="keys">
        @for (a of actions; track a.id) {
          <li>
            <span class="name" [id]="'act-' + a.id">{{ a.label }}</span>
            @for (code of s().keys[a.id]; track code) {
              <span class="chip">
                <kbd>{{ label(code) }}</kbd>
                <button type="button" [disabled]="s().keys[a.id].length <= 1" [attr.aria-label]="'Remove ' + spoken(code) + ' from ' + a.label"
                        (click)="remove(a.id, code)">✕</button>
              </span>
            }
            <button type="button" class="small" #add [attr.data-action]="a.id" [class.listening]="listening() === a.id"
                    [attr.aria-describedby]="'act-' + a.id" (click)="listen(a.id)">{{ listening() === a.id ? 'Press a key…' : 'Add key' }}</button>
          </li>
        }
      </ul>
      <p class="status" role="status">{{ message() }}</p>
      <button type="button" class="btn" (click)="reset()">Reset controls to defaults</button>
    </fieldset>
  `,
})
export class OptionsPanel {
  protected readonly svc = inject(SettingsService);
  protected readonly s = this.svc.settings;
  readonly showDisplay = input(true);
  protected readonly actions = ACTIONS;
  protected readonly speeds = [
    { value: 100, label: 'Normal' },
    { value: 75, label: 'Slower (75%)' },
    { value: 50, label: 'Slowest (50%)' },
  ];
  protected readonly listening = signal<Action | null>(null);
  protected readonly message = signal('');
  private readonly addButtons = viewChildren<ElementRef<HTMLButtonElement>>('add');

  protected label = keyLabel;
  protected spoken = keySpoken;

  private name(a: Action) {
    return ACTIONS.find((x) => x.id === a)!.label.toLowerCase();
  }

  protected listen(action: Action) {
    this.listening.set(action);
    this.svc.capturing.set(true);
    this.message.set(`Press the key for ${this.name(action)}. Press Esc to cancel.`);
  }

  private stop() {
    const a = this.listening();
    this.listening.set(null);
    // let the Esc / key press that ended capture finish before the pause menu or page sees it
    setTimeout(() => this.svc.capturing.set(false));
    if (a) this.focusAdd(a);
  }

  private focusAdd(a: Action) {
    setTimeout(() => this.addButtons().find((b) => b.nativeElement.dataset['action'] === a)?.nativeElement.focus());
  }

  protected remove(action: Action, code: string) {
    this.svc.unbindKey(action, code);
    this.message.set(`Removed ${keySpoken(code)} from ${this.name(action)}.`);
    this.focusAdd(action);
  }

  protected reset() {
    this.svc.resetKeys();
    this.message.set('Controls reset to the defaults.');
  }

  /** Capture phase: grab the next key before the game, the pause menu or the browser can use it. */
  @HostListener('window:keydown', ['$event'])
  protected onKey(e: KeyboardEvent) {
    const action = this.listening();
    if (!action || e.repeat) return;
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key) && !e.code.match(/^(Shift|Control|Alt)(Left|Right)$/)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.code === 'Escape') {
      this.message.set('Cancelled. Nothing changed.');
      this.stop();
      return;
    }
    if (RESERVED_KEYS.includes(e.code)) {
      this.message.set(`${keySpoken(e.code)} can’t be used. Press another key, or Esc to cancel.`);
      return;
    }
    const r = this.svc.bindKey(action, e.code);
    if (r.blockedBy) {
      this.message.set(`${keySpoken(e.code)} is the only key for ${this.name(r.blockedBy)}. Give that action another key first. Press another key, or Esc to cancel.`);
      return;
    }
    this.message.set(
      r.from ? `Added ${keySpoken(e.code)} to ${this.name(action)}. It was moved from ${this.name(r.from)}.` : `Added ${keySpoken(e.code)} to ${this.name(action)}.`,
    );
    this.stop();
  }
}
