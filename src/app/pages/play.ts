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
    :host { display: block; padding: 1rem; }
    main { display: grid; justify-items: center; gap: 1rem; width: min(100%, 1500px); margin: 0 auto;
           --stage-w: min(100%, max(480px, calc((100dvh - 13rem) * 16 / 9))); }
    .screen { display: grid; gap: .75rem; justify-items: center; width: 100%; }
    .screen > * { width: var(--stage-w); }
    .screen:fullscreen { background: var(--bg); padding: .75rem; align-content: center; justify-items: center; overflow: auto;
                         --stage-w: min(100%, calc((100dvh - 8.5rem) * 16 / 9)); }
    .hud { display: grid; grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr)); gap: .5rem 1.25rem; align-items: start; margin: 0;
           padding: .6rem 1rem; background: var(--panel); border: 2px solid var(--border); border-radius: 12px; list-style: none; }
    .hud li { display: flex; flex-direction: column; min-width: 0; }
    .hud .label { font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; opacity: .8; }
    .hud b { font-size: 1.15rem; line-height: 1.25; font-variant-numeric: tabular-nums; }
    .hud .sub { font-size: .8rem; opacity: .8; }
    .hud .lvl { grid-column: span 2; }
    .pills { display: flex; flex-wrap: wrap; gap: .35rem; }
    .pill { display: inline-block; padding: 0 .6rem; border: 2px solid var(--accent); border-radius: 999px; font-size: .9rem; }
    /* Fill the window: as wide as fits while keeping 16:9 and leaving room for the HUD and buttons */
    .stage { position: relative; aspect-ratio: 16 / 9; background: #000; border-radius: 14px; border: 2px solid var(--border);
             box-shadow: 0 12px 40px rgb(0 0 0 / .55), 0 0 0 1px rgb(255 255 255 / .04); overflow: clip; }
    #game, #game canvas { width: 100%; height: 100%; display: block; }
    #game:focus-visible { outline: none; }
    .stage:has(#game:focus-visible) { border-color: var(--accent); }
    .overlay { position: absolute; inset: 0; display: grid; place-content: center; background: rgb(0 0 0 / .78); }
    .overlay .panel { background: var(--panel); border: 2px solid var(--border); border-radius: 12px; padding: 1.5rem; min-width: min(22rem, 90%); }
    .overlay h2 { margin: 0 0 .5rem; }
    .stats { margin: 0 0 1rem; display: grid; grid-template-columns: auto 1fr; gap: .15rem 1rem; }
    .stats dt { opacity: .85; } .stats dd { margin: 0; font-weight: 700; }
    /* On-screen touch controls: a d-pad bottom-left, Fire and Jump bottom-right. Overlaid on the stage in landscape,
       below it in portrait. */
    .overlay { z-index: 5; }
    .controls { position: absolute; z-index: 1; left: 0; right: 0; display: flex; justify-content: space-between; align-items: flex-end;
                gap: 1rem; padding: 0 .75rem; pointer-events: none; -webkit-touch-callout: none; user-select: none; touch-action: none; }
    .controls button { pointer-events: auto; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent;
                       margin: 0; padding: 0; font: inherit; font-weight: 700; color: var(--fg, #fff); cursor: pointer;
                       background: rgb(12 14 26 / .72); border: 3px solid var(--accent, #ffd24a); }
    .controls button.on { background: var(--accent, #ffd24a); color: #111; }
    .controls button:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
    .pad { pointer-events: auto; touch-action: none; display: grid; grid-template: repeat(3, var(--cell)) / repeat(3, var(--cell)); --cell: 60px; }
    .pad button { border-radius: 12px; font-size: 1.6rem; line-height: 1; }
    .pad .up { grid-area: 1 / 2; } .pad .left { grid-area: 2 / 1; } .pad .right { grid-area: 2 / 3; } .pad .down { grid-area: 3 / 2; }
    .actions { display: flex; align-items: flex-end; gap: .9rem; }
    .actions button { width: 76px; height: 76px; border-radius: 50%; font-size: 1.05rem; }
    .actions .jump { margin-bottom: 1.4rem; }
    @media (orientation: landscape) { .controls { bottom: .6rem; } }
    @media (orientation: portrait) {
      .stage.touch-ui { margin-bottom: 14rem; overflow: visible; }
      .controls { top: 100%; margin-top: .75rem; }
      .pad { --cell: 68px; }
      .actions button { width: 84px; height: 84px; }
    }
    @media (pointer: coarse) and (orientation: landscape) {
      main { --stage-w: min(100%, calc((100dvh - 7.5rem) * 16 / 9)); }
    }
    @media (prefers-reduced-motion: no-preference) { .controls button { transition: background-color .08s; } }
    @media (forced-colors: active) { .controls button { border-color: ButtonText; } .controls button.on { forced-color-adjust: none; background: Highlight; color: HighlightText; } }
    .bar { display: flex; gap: .75rem; flex-wrap: wrap; align-items: center; }
    .bar .btn { width: auto; min-width: 7.5rem; }
    .bar .spacer { flex: 1; }
    .help { width: var(--stage-w); background: var(--panel); border: 2px solid var(--border); border-radius: 12px; padding: 1.25rem 1.5rem 1.5rem; }
    .help h2 { margin: 0 0 .25rem; font-size: 1.25rem; }
    .help .intro { margin: 0 0 1rem; max-width: 70ch; opacity: .92; }
    .help .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr)); gap: 1.25rem 2rem; }
    .help h3 { margin: 0 0 .4rem; font-size: .8rem; letter-spacing: .08em; text-transform: uppercase; color: var(--accent); }
    .help ul { margin: 0; padding: 0; list-style: none; display: grid; gap: .4rem; }
    .help li { padding-left: 0; font-size: .95rem; }
    .help li strong { font-weight: 700; }
    .help p { margin: 0; font-size: .95rem; }
  `,
  template: `
    <main>
      <h1 class="visually-hidden">Iggy’s Quest – game</h1>

      <div #screen class="screen">
      <ul class="hud" aria-label="Game status">
        <li class="lvl"><span class="label">Level</span><b>{{ hud().level }}</b></li>
        <li><span class="label">Score</span><b>{{ hud().score }}</b><span class="sub">of {{ hud().goal }} to finish</span></li>
        <li><span class="label">Breadboards</span><b>{{ hud().breadboards }}</b><span class="sub">{{ hud().nextLifeIn }} to a free life</span></li>
        <li><span class="label">Lives</span><b>{{ hud().lives }}</b></li>
        <li><span class="label">Suit</span><b>{{ hud().suit }}</b>
          @if (hud().nextSuit) { <span class="sub">{{ hud().nextSuitNeed }} more for {{ hud().nextSuit }}</span> }
        </li>
        @if (hud().powerUps.length) {
          <li><span class="label">Power-ups</span>
            <span class="pills">
            @for (p of hud().powerUps; track p.id) {
              <span class="pill">{{ p.label }} {{ p.detail }}</span>
            }
            </span>
          </li>
        }
      </ul>

      <div class="stage" [class.touch-ui]="touchUi()">
        <div #game id="game" tabindex="0" role="application" aria-label="Iggy’s Quest game canvas. Visual game; see the How to play section below the game." aria-describedby="help-intro"></div>
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
        @if (touchUi()) {
          <div class="controls" [attr.inert]="overlay() !== 'none' ? '' : null" (contextmenu)="$event.preventDefault()">
            <div class="pad" role="group" aria-label="Directional pad"
                 (pointerdown)="padMove($event, true)" (pointermove)="padMove($event, false)" (pointerup)="padEnd($event)" (pointercancel)="padEnd($event)">
              <button class="up" type="button" [class.on]="pad().up" aria-label="Jump up" (click)="tap($event, 'up')">▲</button>
              <button class="left" type="button" [class.on]="pad().left" aria-label="Move left" (click)="tap($event, 'left')">◀</button>
              <button class="right" type="button" [class.on]="pad().right" aria-label="Move right" (click)="tap($event, 'right')">▶</button>
              <button class="down" type="button" [class.on]="pad().down" aria-label="Duck" (click)="tap($event, 'down')">▼</button>
            </div>
            <div class="actions">
              <button class="fire" type="button" [class.on]="btn().fire" (pointerdown)="holdBtn('fire', true)" (pointerup)="holdBtn('fire', false)" (pointercancel)="holdBtn('fire', false)" (pointerleave)="holdBtn('fire', false)" (click)="tapBtn($event, 'fire')">Fire</button>
              <button class="jump" type="button" [class.on]="btn().jump" (pointerdown)="holdBtn('jump', true)" (pointerup)="holdBtn('jump', false)" (pointercancel)="holdBtn('jump', false)" (pointerleave)="holdBtn('jump', false)" (click)="tapBtn($event, 'jump')">Jump</button>
            </div>
          </div>
        }
      </div>

      <div class="bar">
        <button class="btn" type="button" (click)="pause()" [disabled]="overlay() !== 'none'">Pause (Esc)</button>
        <button class="btn" type="button" [attr.aria-pressed]="musicOn()" (click)="toggleMusic()">Music</button>
        @if (canFullscreen) {
          <button class="btn" type="button" [attr.aria-pressed]="fullscreen()" (click)="toggleFullscreen()">Fullscreen</button>
        }
        <span class="spacer"></span>
        <a class="btn" routerLink="/">Quit to menu</a>
      </div>
      </div>

      <section id="help" class="help" aria-labelledby="help-title">
        <h2 id="help-title">How to play</h2>
        <p id="help-intro" class="intro">Iggy is an old, clumsy robot running across the rooftops. Reach a score of 5000 to finish the level. Don’t fall between buildings.</p>
        <div class="cols">
          <div>
            <h3>Controls</h3>
            <ul>
              <li><strong>Move:</strong> <kbd>←</kbd> <kbd>→</kbd> or <kbd>A</kbd> <kbd>D</kbd></li>
              <li><strong>Jump:</strong> <kbd>Space</kbd>, <kbd>↑</kbd> or <kbd>W</kbd>. Hold for a higher jump; press again in mid-air for a double jump.</li>
              <li><strong>Wall kick:</strong> if you fall into a gap, press jump while touching the side of a building.</li>
              <li><strong>Duck:</strong> hold <kbd>↓</kbd> or <kbd>S</kbd>. Iggy crouches and can’t run, and his shots fly low, so he can hit small targets on the ground, like crawlers, that standing shots pass over.</li>
              <li><strong>Shoot:</strong> <kbd>X</kbd> or <kbd>F</kbd> (hold to keep firing), once you have a gun.</li>
              <li><strong>Pause:</strong> <kbd>Esc</kbd> or the Pause button. The Fullscreen button fills your screen; press <kbd>Esc</kbd> to leave it.</li>
              <li><strong>Touch screen:</strong> use the on-screen d-pad (up jumps, down ducks) and the Fire and Jump buttons.</li>
            </ul>
          </div>
          <div>
            <h3>Collect</h3>
            <ul>
              <li><strong>Breadboards</strong> unlock new suits; every 100 earns a free life.</li>
              <li><strong>Golden rings:</strong> jump through them for bonus points. Rings passed in quick succession build a chain worth more each time, up to 100 points a ring.</li>
              <li><strong>Glowing power-ups:</strong> spring legs, magnet, shield, overclock, the golden star and guns.</li>
              <li><strong>Golden star:</strong> Iggy is invincible for 8 seconds. Pylons, walls and enemies are smashed when you touch them, but falling into a gap still costs a life.</li>
              <li><strong>Guns</strong> have a limited number of shots, with no time limit, so you can save them. Grab another gun while you still have shots to upgrade it: blaster, twin blaster, spread gun, then rocket launcher.</li>
            </ul>
          </div>
          <div>
            <h3>Watch out for</h3>
            <ul>
              <li><strong>Sparking pylons</strong> zap you. Jump them or shoot them.</li>
              <li><strong>Brick walls</strong> don’t hurt, but crashing through slows you down for a couple of seconds. Shoot them to keep your speed.</li>
              <li><strong>Skeletons and crawlers</strong> patrol the rooftops and cost a life if you touch them from the side. Land on top of them to stomp them, or shoot them.</li>
              <li><strong>Gaps</strong> between buildings cost a life.</li>
            </ul>
          </div>
        </div>
      </section>
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
  private readonly touch: TouchInput = { left: false, right: false, jump: false, fire: false, duck: false };
  /** show the on-screen controls on touch devices, or anywhere with ?controls=1 in the address */
  protected readonly touchUi = signal(false);
  protected readonly pad = signal({ left: false, right: false, up: false, down: false });
  protected readonly btn = signal({ jump: false, fire: false });
  private padPointer: number | null = null;
  private game?: Phaser.Game;

  constructor() {
    const mq = window.matchMedia('(pointer: coarse)');
    const forced = new URLSearchParams(window.location.search).has('controls');
    this.touchUi.set(mq.matches || forced);
    mq.addEventListener?.('change', (e) => this.touchUi.set(e.matches || forced));
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

  /** copy the d-pad and button state into the flags the game reads */
  private sync() {
    const p = this.pad(), b = this.btn();
    this.touch.left = p.left;
    this.touch.right = p.right;
    this.touch.duck = p.down;
    this.touch.jump = p.up || b.jump;
    this.touch.fire = b.fire;
  }

  /** One thumb can slide around the d-pad: the direction comes from where the finger is on the pad. */
  protected padMove(e: PointerEvent, start: boolean) {
    const el = e.currentTarget as HTMLElement;
    if (start) {
      this.padPointer = e.pointerId;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* capture is only a nicety; the pad still works without it */
      }
      e.preventDefault();
    } else if (e.pointerId !== this.padPointer) return;
    const r = el.getBoundingClientRect();
    const dx = ((e.clientX - r.left) / r.width) * 2 - 1, dy = ((e.clientY - r.top) / r.height) * 2 - 1;
    this.pad.set({ left: dx < -0.28, right: dx > 0.28, up: dy < -0.45, down: dy > 0.45 });
    this.sync();
  }

  protected padEnd(e: PointerEvent) {
    if (e.pointerId !== this.padPointer) return;
    this.padPointer = null;
    this.pad.set({ left: false, right: false, up: false, down: false });
    this.sync();
  }

  protected holdBtn(key: 'jump' | 'fire', down: boolean) {
    this.btn.update((b) => ({ ...b, [key]: down }));
    this.sync();
  }

  /** Keyboard / screen-reader activation (a click with no pointer): press and release after a moment. */
  protected tap(e: MouseEvent, dir: 'left' | 'right' | 'up' | 'down') {
    if (e.detail !== 0) return;
    this.pad.update((p) => ({ ...p, [dir]: true }));
    this.sync();
    setTimeout(() => {
      this.pad.update((p) => ({ ...p, [dir]: false }));
      this.sync();
    }, dir === 'up' ? 150 : 350);
  }

  protected tapBtn(e: MouseEvent, key: 'jump' | 'fire') {
    if (e.detail !== 0) return;
    this.holdBtn(key, true);
    setTimeout(() => this.holdBtn(key, false), key === 'jump' ? 150 : 250);
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
