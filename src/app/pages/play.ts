import { Component, computed, effect, input, isDevMode, ElementRef, HostListener, NgZone, OnDestroy, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import type Phaser from 'phaser';
import { SettingsService } from '../settings.service';
import type { GameOverState, HudState, TouchInput } from '../game/play.scene';
import { LEVELS, levelById } from '../game/levels';

type Overlay = 'none' | 'paused' | 'gameover' | 'complete';

@Component({
  selector: 'app-play',
  imports: [RouterLink],
  styles: `
    :host { display: grid; justify-items: center; gap: .75rem; padding: 1rem; }
    main { display: grid; gap: .75rem; width: min(100%, 1500px); }
    .screen { --stage-w: min(100%, max(480px, calc((100dvh - 14rem) * 16 / 9))); display: grid; gap: .75rem; justify-items: center; }
    .screen > * { width: var(--stage-w); }
    .screen:fullscreen { background: var(--bg); padding: .75rem; align-content: center; justify-items: center; overflow: auto; }
    .screen:fullscreen { --stage-w: min(100%, calc((100dvh - 7.5rem) * 16 / 9)); }
    .hud { display: flex; flex-wrap: wrap; gap: .5rem 1.25rem; align-items: center; margin: 0; padding: .5rem .75rem;
           background: var(--panel); border: 2px solid var(--border); border-radius: 8px; list-style: none; }
    .hud li { white-space: nowrap; }
    .hud .label { opacity: .8; font-size: .85rem; margin-right: .35rem; }
    .hud b { font-variant-numeric: tabular-nums; }
    .hud .grow { flex: 1; }
    .pill { display: inline-block; padding: 0 .6rem; border: 2px solid var(--accent); border-radius: 999px; margin-right: .35rem; }
    /* Fill the window: as wide as fits while keeping 16:9 and leaving room for the HUD and buttons */
    .stage { position: relative; aspect-ratio: 16 / 9; background: #000; }
    #game, #game canvas { width: 100%; height: 100%; display: block; }
    .overlay { position: absolute; inset: 0; display: grid; place-content: center; background: rgb(0 0 0 / .78); }
    .overlay .panel { background: var(--panel); border: 2px solid var(--border); border-radius: 12px; padding: 1.5rem; min-width: min(22rem, 90%); }
    .overlay h2 { margin: 0 0 .5rem; }
    .stats { margin: 0 0 1rem; display: grid; grid-template-columns: auto 1fr; gap: .15rem 1rem; }
    .stats dt { opacity: .85; } .stats dd { margin: 0; font-weight: 700; }
    .controls { display: none; }
    @media (pointer: coarse) {
      .controls { display: flex; justify-content: space-between; gap: 1rem; }
      .controls .group { display: flex; gap: .75rem; }
      .controls button { min-width: 72px; min-height: 64px; font-size: 1.5rem; touch-action: none; user-select: none; }
    }
    .small { margin: 0; max-width: 70ch; font-size: .95rem; }
    .bar { display: flex; gap: .75rem; flex-wrap: wrap; }
    .bar .btn { width: auto; }
  `,
  template: `
    <main>
      <h1 class="visually-hidden">Iggy’s Quest – game</h1>

      <div #screen class="screen">
      <ul class="hud" aria-label="Game status">
        <li><span class="label">Level</span><b>{{ hud().level }}</b></li>
        <li><span class="label">Score</span><b>{{ hud().score }}</b> <span class="label">/ {{ hud().goal }} to finish</span></li>
        <li><span class="label">Breadboards</span><b>{{ hud().breadboards }}</b> <span class="label">· {{ hud().nextLifeIn }} to a free life</span></li>
        <li><span class="label">Lives</span><b>{{ hud().lives }}</b></li>
        <li><span class="label">Suit</span><b>{{ hud().suit }}</b>
          @if (hud().nextSuit) { <span class="label"> · {{ hud().nextSuitNeed }} more for {{ hud().nextSuit }}</span> }
        </li>
        @if (hud().powerUps.length) {
          <li><span class="label">Power-ups</span>
            @for (p of hud().powerUps; track p.id) {
              <span class="pill">{{ p.label }} {{ p.detail }}</span>
            }
          </li>
        }
      </ul>

      <div class="stage">
        <div #game id="game" tabindex="0" role="application" aria-label="Iggy’s Quest game canvas. Visual game; see the controls described below the game." aria-describedby="help"></div>
        @if (overlay() !== 'none') {
          <div class="overlay">
            <div class="panel" role="dialog" aria-modal="true" aria-labelledby="ov-title">
              <h2 id="ov-title" tabindex="-1">{{ overlay() === 'paused' ? 'Paused' : overlay() === 'complete' ? 'Level complete!' : 'Iggy has fallen apart' }}</h2>
              @if (overlay() === 'complete' && !nextLevel()) { <p>That was the last level for now.</p> }
              @if ((overlay() === 'gameover' || overlay() === 'complete') && over(); as o) {
                <dl class="stats">
                  <dt>Score</dt><dd>{{ o.score }}</dd>
                  <dt>Breadboards</dt><dd>{{ o.breadboards }}</dd>
                  <dt>Distance</dt><dd>{{ o.distance }} m</dd>
                  <dt>Final suit</dt><dd>{{ o.suit }}</dd>
                  <dt>Best</dt><dd>{{ o.best }}@if (o.newBest) { – new best! }</dd>
                </dl>
              }
              <div class="stack">
                @if (overlay() === 'paused') {
                  <button class="btn primary" type="button" (click)="resume()">Resume</button>
                } @else {
                  @if (overlay() === 'complete' && nextLevel(); as next) {
                    <a class="btn primary" [routerLink]="['/play', next.id]">Next level: {{ next.name }}</a>
                  }
                  <button class="btn" [class.primary]="overlay() === 'gameover' || !nextLevel()" type="button" (click)="restart()">{{ overlay() === 'complete' ? 'Replay this level' : 'Play again' }}</button>
                }
                <a class="btn" routerLink="/">Quit to menu</a>
              </div>
            </div>
          </div>
        }
      </div>

      <div class="controls">
        <div class="group">
          <button class="btn" type="button" aria-label="Move left" (pointerdown)="hold('left', true)" (pointerup)="hold('left', false)" (pointercancel)="hold('left', false)" (pointerleave)="hold('left', false)">←</button>
          <button class="btn" type="button" aria-label="Move right" (pointerdown)="hold('right', true)" (pointerup)="hold('right', false)" (pointercancel)="hold('right', false)" (pointerleave)="hold('right', false)">→</button>
        </div>
 <button class="btn" type="button" aria-label="Fire" (pointerdown)="hold('fire', true)" (pointerup)="hold('fire', false)" (pointercancel)="hold('fire', false)" (pointerleave)="hold('fire', false)">Fire</button>
        <button class="btn" type="button" aria-label="Jump" (pointerdown)="hold('jump', true)" (pointerup)="hold('jump', false)" (pointercancel)="hold('jump', false)" (pointerleave)="hold('jump', false)">Jump</button>
      </div>

      <div class="bar">
        <button class="btn" type="button" (click)="pause()" [disabled]="overlay() !== 'none'">Pause (Esc)</button>
        <button class="btn" type="button" [attr.aria-pressed]="musicOn()" (click)="toggleMusic()">Music</button>
        @if (canFullscreen) {
          <button class="btn" type="button" [attr.aria-pressed]="fullscreen()" (click)="toggleFullscreen()">Fullscreen</button>
        }
      </div>
      </div>

      <p id="help" class="small">
        Iggy is an old, clumsy robot running across the rooftops. Move with <kbd>←</kbd> <kbd>→</kbd> or <kbd>A</kbd> <kbd>D</kbd>.
        Jump with <kbd>Space</kbd>, <kbd>↑</kbd> or <kbd>W</kbd> (hold for a higher jump); press jump again in mid-air for a double jump.
        If you fall into a gap, press jump while touching the side of a building to kick off the wall.
        Collect breadboards to unlock new suits; every 100 earns a free life. Grab glowing power-ups. A gun power-up lets you shoot with
        <kbd>X</kbd> or <kbd>F</kbd> (hold to keep firing) to destroy sparking pylons and brick walls. A gun has a limited number of shots, with no time limit, so you can save them.
        Grab another gun while you still have shots to upgrade it and add more: blaster, twin blaster, spread gun, then rocket launcher.
        Running into a brick wall doesn't hurt, but it slows you down for a couple of seconds. Don't fall between buildings.
        Reach a score of 5000 to finish the level. Pause with <kbd>Esc</kbd> or the Pause button. The Fullscreen button fills your whole screen; press the Esc key to leave it.
      </p>
      <p aria-live="polite" class="visually-hidden">{{ announcement() }}</p>
    </main>
  `,
})
export class PlayPage implements OnDestroy {
  private readonly settings = inject(SettingsService);
  private readonly zone = inject(NgZone);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('game');
  private readonly screen = viewChild.required<ElementRef<HTMLElement>>('screen');
  protected readonly canFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled;
  protected readonly fullscreen = signal(false);
  protected readonly musicOn = computed(() => this.settings.settings().musicOn);

  /** From the route: /play/:level */
  readonly level = input<string>();
  protected readonly overlay = signal<Overlay>('none');
  protected readonly announcement = signal('');
  protected readonly over = signal<GameOverState | null>(null);
  protected readonly nextLevel = computed(() => {
    const o = this.over();
    const i = LEVELS.findIndex((l) => l.id === o?.level);
    return i >= 0 ? LEVELS[i + 1] : undefined;
  });
  protected readonly hud = signal<HudState>({ level: '', goal: 5000, score: 0, breadboards: 0, lives: 3, nextLifeIn: 100, suit: 'Rusty Original', nextSuit: 'Patchwork', nextSuitNeed: 5, powerUps: [] });
  private readonly touch: TouchInput = { left: false, right: false, jump: false, fire: false };
  private game?: Phaser.Game;

  constructor() {
    // The route changed to another level (e.g. "Next level"): reuse the game and restart it on that level.
    effect(() => {
      const id = levelById(this.level()).id;
      const game = this.game;
      if (!game || game.registry.get('level') === id) return;
      game.registry.set('level', id);
      game.scene.getScene('play').scene.restart();
      this.overlay.set('none');
      this.over.set(null);
      this.announcement.set('');
      setTimeout(() => this.host().nativeElement.focus());
    });
    afterNextRender(async () => {
      // Load Phaser lazily so the menu pages stay small.
      const { createGame } = await import('../game/game-host');
      this.game = createGame(this.host().nativeElement, this.settings.settings(), this.touch, levelById(this.level()).id);
      if (isDevMode()) (window as unknown as { __game?: Phaser.Game }).__game = this.game; // dev-only handle for debugging
      this.game.events.on('hud', (s: HudState) => this.zone.run(() => this.hud.set(s)));
      this.game.events.on('announce', (t: string) => this.zone.run(() => this.announcement.set(t)));
      this.game.events.on('complete', (s: GameOverState) =>
        this.zone.run(() => {
          this.over.set(s);
          this.show('complete');
        }),
      );
      this.game.events.on('gameover', (s: GameOverState) =>
        this.zone.run(() => {
          this.over.set(s);
          this.show('gameover');
        }),
      );
      this.host().nativeElement.focus();
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape() {
    if (this.overlay() === 'paused') this.resume();
    else if (this.overlay() === 'none') this.pause();
  }

  @HostListener('document:fullscreenchange')
  protected onFullscreenChange() {
    this.fullscreen.set(!!document.fullscreenElement);
    // let the layout settle, then tell Phaser to refit the canvas
    setTimeout(() => this.game?.scale.refresh(), 100);
  }

  @HostListener('window:resize')
  protected onResize() {
    setTimeout(() => this.game?.scale.refresh(), 50);
  }

  protected async toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await this.screen().nativeElement.requestFullscreen();
    } catch {
      /* the browser refused (e.g. not allowed here); stay windowed */
    }
    // keep keyboard focus on the game so Space jumps instead of re-pressing this button
    this.host().nativeElement.focus();
  }

  protected toggleMusic() {
    this.settings.update({ musicOn: !this.settings.settings().musicOn });
    const s = this.settings.settings();
    this.game?.registry.set('music', { on: s.musicOn, volume: s.musicVolume });
    this.host().nativeElement.focus(); // keep Space as "jump"
  }

  protected hold(key: keyof TouchInput, down: boolean) {
    this.touch[key] = down;
  }

  protected pause() {
    this.show('paused');
  }

  protected resume() {
    this.overlay.set('none');
    this.game?.scene.resume('play');
    this.announcement.set('Resumed');
    this.host().nativeElement.focus();
  }

  protected restart() {
    this.overlay.set('none');
    this.over.set(null);
    this.announcement.set('New game');
    this.game?.scene.getScene('play').scene.restart();
    this.host().nativeElement.focus();
  }

  private show(kind: Exclude<Overlay, 'none'>) {
    if (kind === 'paused') this.game?.scene.pause('play');
    this.overlay.set(kind);
    // Move focus into the dialog once it has rendered.
    setTimeout(() => document.getElementById('ov-title')?.focus());
  }

  ngOnDestroy() {
    this.game?.destroy(true);
  }
}
