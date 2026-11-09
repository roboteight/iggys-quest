import { Component, computed, effect, input, isDevMode, ElementRef, HostListener, NgZone, OnDestroy, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import type Phaser from 'phaser';
import { Action, SettingsService, keyLabel } from '../settings.service';
import { dailyBoard, dailySeed, hash } from '../daily';
import { fmtTime } from '../format';
import { Achievement } from '../achievements';
import { OptionsPanel } from './options';
import { ProgressService } from '../progress.service';
import type { GameOverState, HudState, TouchInput } from '../game/play.scene';
import { LEVELS, levelById } from '../game/levels';

type Overlay = 'none' | 'intro' | 'paused' | 'gameover' | 'complete';

@Component({
  selector: 'app-play',
  imports: [RouterLink, OptionsPanel],
  styles: `
    :host { display: block; padding: 1rem; }
    main { display: grid; grid-template-columns: minmax(0, 1fr); justify-items: center; gap: 1rem; width: min(100%, 1500px); margin: 0 auto;
           --stage-w: min(100%, max(480px, calc((100dvh - 13rem) * 16 / 9))); }
    .screen { display: grid; grid-template-columns: minmax(0, 1fr); gap: .75rem; justify-items: center; width: 100%; }
    .screen > * { width: var(--stage-w); box-sizing: border-box; }
    .screen:fullscreen { background: var(--bg); padding: .75rem; align-content: center; justify-items: center; overflow: auto;
                         --stage-w: min(100%, calc((100dvh - 8.5rem) * 16 / 9)); }
    .hud { display: grid; grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr)); gap: .5rem 1.25rem; align-items: start; margin: 0;
           padding: .6rem 1rem; background: var(--panel); border: 2px solid var(--border); border-radius: 12px; list-style: none; }
    .hud li { display: flex; flex-direction: column; min-width: 0; }
    .hud .label { font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; opacity: .8; }
    .hud b { font-size: 1.15rem; line-height: 1.25; font-variant-numeric: tabular-nums; }
    .hud .sub { font-size: .8rem; opacity: .8; }
    .hud .lvl { grid-column: span 2; }
    @media (max-width: 30rem) { .hud { grid-template-columns: repeat(2, minmax(0, 1fr)); } .hud .lvl, .hud .boss { grid-column: 1 / -1; } }
    .hud .boss { grid-column: span 2; } .hud .boss meter { width: 100%; height: 1rem; }
    .pills { display: flex; flex-wrap: wrap; gap: .35rem; }
    .pill { display: inline-block; padding: 0 .6rem; border: 2px solid var(--accent); border-radius: 999px; font-size: .9rem; }
    /* Fill the window: as wide as fits while keeping 16:9 and leaving room for the HUD and buttons */
    .stage { position: relative; aspect-ratio: 16 / 9; background: #000; border-radius: 14px; border: 2px solid var(--border);
             box-shadow: 0 12px 40px rgb(0 0 0 / .55), 0 0 0 1px rgb(255 255 255 / .04); overflow: clip; }
    #game, #game canvas { width: 100%; height: 100%; display: block; }
    #game:focus-visible { outline: none; }
    .stage:has(#game:focus-visible) { border-color: var(--accent); }
    .overlay { position: absolute; inset: 0; display: grid; place-content: center; background: rgb(0 0 0 / .78); }
    .overlay .panel { background: var(--panel); border: 2px solid var(--border); border-radius: 12px; padding: 1.5rem; min-width: min(22rem, 90%); max-width: 100%; max-height: 100%; overflow-y: auto; box-sizing: border-box; }
    .overlay .panel.wide { width: min(40rem, 96%); }
    .overlay h2 { margin: 0 0 .5rem; }
    .stats { margin: 0 0 1rem; display: grid; grid-template-columns: auto 1fr; gap: .15rem 1rem; }
    .stats dt { opacity: .85; } .stats dd { margin: 0; font-weight: 700; }
    /* On-screen touch controls: a d-pad bottom-left, Fire and Jump bottom-right. Overlaid on the stage in landscape,
       below it in portrait. */
    .overlay { z-index: 5; }
    .toast { position: fixed; left: 50%; bottom: 1rem; transform: translateX(-50%); margin: 0; max-width: min(36rem, 92vw); padding: .6rem 1rem; z-index: 20; font-weight: 700; text-align: center;
             color: var(--fg); background: var(--panel); border: 2px solid var(--accent); border-radius: 12px; box-shadow: 0 6px 24px rgb(0 0 0 / .5); }
    @media (forced-colors: active) { .toast { border-color: CanvasText; } }
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
      .pad { --cell: min(68px, 16vw); }
      .actions { gap: min(.9rem, 2vw); }
      .actions button { width: min(84px, 20vw); height: min(84px, 20vw); }
    }
    @media (pointer: coarse) and (orientation: landscape) {
      main { --stage-w: min(100%, calc((100dvh - 7.5rem) * 16 / 9)); }
    }

    /* Touch devices: the game fills the whole screen. Portrait stacks status, game, controls (taking the free height) and
       buttons; landscape gives the game everything under a one-line header and floats the controls over its lower corners. */
    :host:has(.screen.touch) { padding: 0; }
    .screen.touch { height: 100dvh; width: 100%; box-sizing: border-box; gap: .4rem; overflow: hidden; align-content: stretch;
                    padding: max(.4rem, env(safe-area-inset-top)) max(.5rem, env(safe-area-inset-right)) max(.4rem, env(safe-area-inset-bottom)) max(.5rem, env(safe-area-inset-left)); }
    .screen.touch > * { width: 100%; min-width: 0; }
    .screen.touch .hud { grid-area: hud; display: flex; flex-wrap: nowrap; align-items: start; padding: .25rem .6rem; gap: .1rem .9rem; border-radius: 10px; overflow: hidden; }
    .screen.touch .hud li { position: relative; flex: 0 0 auto; }
    .screen.touch .hud .lvl, .screen.touch .hud li:nth-child(5) { flex: 0 1 auto; }
    .screen.touch .hud b { font-size: 1rem; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .screen.touch .hud .label { font-size: .62rem; }
    /* the small print stays for screen readers, just not on screen */
    .screen.touch .hud .sub { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    @media (orientation: landscape) and (max-width: 760px) { .screen.touch .hud .lvl, .screen.touch .hud li:nth-child(5) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; } }
    .screen.touch .stage { grid-area: stage; }
    .screen.touch .controls { grid-area: controls; position: relative; inset: auto; margin: 0; padding: 0 .25rem .25rem; }
    .screen.touch .bar { grid-area: bar; flex-wrap: nowrap; gap: .4rem; }
    .screen.touch .bar .btn { min-width: 0; min-height: 2.5rem; padding: .25rem .5rem; font-size: .9rem; flex: 0 1 auto; white-space: nowrap; }
    .screen.touch .bar .spacer { flex: 1; }
    @media (orientation: portrait) {
      .screen.touch { grid-template: "hud" auto "stage" auto "controls" minmax(0, 1fr) "bar" auto / minmax(0, 1fr); }
      .screen.touch .stage { margin: 0; overflow: clip; }
      .screen.touch .controls { align-self: end; }
      .screen.touch .pad { --cell: min(60px, 15vw); }
      .screen.touch .actions { gap: min(.9rem, 2vw); }
      .screen.touch .actions button { width: min(72px, 18vw); height: min(72px, 18vw); }
      .screen.touch .controls { gap: .5rem; }
    }
    @media (orientation: landscape) {
      .screen.touch { grid-template: "hud bar" auto "stage stage" minmax(0, 1fr) / minmax(0, 1fr) auto; column-gap: .5rem; }
      .screen.touch .stage { aspect-ratio: auto; height: 100%; min-height: 0; }
      .screen.touch .controls { grid-area: stage; align-self: end; z-index: 2; padding: 0 .75rem .5rem; }
      .screen.touch .pad { --cell: 52px; }
      .screen.touch .actions button { width: 64px; height: 64px; }
      .screen.touch .actions .jump { margin-bottom: 1rem; }
    }
    @media (orientation: landscape) and (max-height: 420px) {
      .screen.touch .pad { --cell: 46px; }
      .screen.touch .actions button { width: 58px; height: 58px; font-size: .95rem; }
      .screen.touch .actions .jump { margin-bottom: .8rem; }
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

      <div #screen class="screen" [class.touch]="touchUi()">
      <ul class="hud" aria-label="Game status">
        <li class="lvl"><span class="label">Level</span><b>{{ hud().level }}</b></li>
        <li><span class="label">Score</span><b>{{ hud().score }}</b><span class="sub">@switch (hud().mode) { @case ('endless') { Endless: no boss, the pace creeps up } @case ('time') { Time attack: race to the boss } @default { of {{ hud().goal }} to reach the boss } }</span></li>
        @if (hud().mode === 'time') { <li><span class="label">Time</span><b>{{ fmt(hud().time * 1000) }}</b><span class="sub">{{ hasGhost() ? 'Ghost of your best run' : 'No ghost yet' }}</span></li> }
        <li><span class="label">Breadboards</span><b>{{ hud().breadboards }}</b><span class="sub">{{ hud().nextLifeIn }} to a free life · {{ hud().perfect ? 'Perfect run alive' : 'Perfect run lost' }}</span></li>
        <li><span class="label">Lives</span><b>{{ hud().lives }}</b></li>
        <li><span class="label">Suit</span><b>{{ hud().suit }}</b>
          @if (hud().nextSuit) { <span class="sub">{{ hud().nextSuitNeed }} {{ hud().nextSuitNeed === 1 ? 'ring' : 'rings' }} to {{ hud().nextSuit }}</span> }
        </li>
        @if (hud().boss; as boss) {
          <li class="boss"><span class="label">Boss: {{ boss.name }}</span>
            <meter [min]="0" [max]="boss.max" [value]="boss.hp" [attr.aria-label]="boss.name + ' health'" [attr.title]="boss.hp + ' of ' + boss.max"></meter>
            <span class="sub">{{ boss.hp }} of {{ boss.max }} health</span>
          </li>
        }
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
            <div class="panel" [class.wide]="pauseView() === 'options'" role="dialog" aria-modal="true" aria-labelledby="ov-title" (keydown.tab)="trap($event, false)" (keydown.shift.tab)="trap($event, true)">
              <h2 id="ov-title" tabindex="-1">{{ title() }}</h2>
              @if (overlay() === 'intro') { <p>{{ story().intro }}</p> }
              @if (overlay() === 'complete' && gameMode() === 'story' && !isDaily()) {
                <p>{{ story().outro }}</p>
                @if (!nextLevel()) { <p><strong>The end.</strong> Every boss mech is scrap, Iggy is in his best suit and the road home is open. Thank you for playing. You can still chase perfect runs, secrets, the daily challenge and the time attack boards.</p> }
              }
              @if ((overlay() === 'gameover' || overlay() === 'complete') && over(); as o) {
                <dl class="stats">
                  @if (o.mode === 'time' && overlay() === 'complete') { <dt>Time</dt><dd>{{ fmt(o.time) }}</dd> }
                  <dt>Score</dt><dd>{{ o.score }}</dd>
                  <dt>Breadboards</dt><dd>{{ o.breadboards }}@if (o.perfect) { – Perfect run! ★ }</dd>
                  <dt>Distance</dt><dd>{{ o.distance }} m</dd>
                  <dt>Final suit</dt><dd>{{ o.suit }}</dd>
                  <dt>{{ gameMode() === 'time' ? 'Best time' : isDaily() ? 'Best today' : 'Best' }}</dt><dd>{{ gameMode() === 'time' ? fmt(progress.best(board(o.level))) : progress.best(board(o.level)) }}@if (rank() === 1) { – new best! }</dd>
                  @if (rank(); as r) { <dt>High scores</dt><dd>Place {{ r }} of 5</dd> }
                </dl>
              }
              <div class="stack">
                @if (overlay() === 'intro') {
                  <button class="btn primary" type="button" (click)="beginLevel()">Start level</button>
                } @else if (overlay() === 'paused' && pauseView() === 'options') {
                  <app-options [showDisplay]="false" />
                  <button class="btn primary" type="button" (click)="pauseView.set('main'); refocus()">Back to the pause menu</button>
                } @else if (overlay() === 'paused') {
                  <button class="btn primary" type="button" (click)="resume()">Resume</button>
                  <button class="btn" type="button" (click)="pauseView.set('options'); refocus()">Options and controls</button>
                } @else {
                  @if (overlay() === 'complete' && nextLevel(); as next) {
                    <a class="btn primary" [routerLink]="['/play', next.id]" [queryParams]="gameMode() === 'time' ? { mode: 'time' } : null">Next level: {{ next.name }}</a>
                  }
                  <button class="btn" [class.primary]="overlay() === 'gameover' || !nextLevel()" type="button" (click)="restart()">{{ overlay() === 'complete' ? 'Replay this level' : 'Play again' }}</button>
                }
                <a class="btn" routerLink="/">Quit to menu</a>
              </div>
            </div>
          </div>
        }
      </div>
      @if (touchUi()) {
        <div class="controls" [attr.inert]="overlay() !== 'none' ? '' : null" (contextmenu)="$event.preventDefault()" (pointerdown)="enterFullscreenOnce()">
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
              <li><strong>Move left:</strong> @for (c of keys('left'); track c) { <kbd>{{ label(c) }}</kbd> } <strong>right:</strong> @for (c of keys('right'); track c) { <kbd>{{ label(c) }}</kbd> }</li>
              <li><strong>Jump:</strong> @for (c of keys('jump'); track c) { <kbd>{{ label(c) }}</kbd> }. Hold for a higher jump; press again in mid-air for a double jump.</li>
              <li><strong>Wall kick:</strong> if you fall into a gap, press jump while touching the side of a building.</li>
              <li><strong>Duck:</strong> hold @for (c of keys('duck'); track c) { <kbd>{{ label(c) }}</kbd> }. Iggy crouches and can’t run, and his shots fly low, so he can hit small targets on the ground, like crawlers, that standing shots pass over.</li>
              <li><strong>Shoot:</strong> @for (c of keys('fire'); track c) { <kbd>{{ label(c) }}</kbd> } (hold to keep firing), once you have a gun.</li>
              <li><strong>Pause:</strong> <kbd>Esc</kbd> or the Pause button. You can change the keys, and make the game easier, under Options in the pause menu or on the Settings page. The Fullscreen button fills your screen; press <kbd>Esc</kbd> to leave it.</li>
              <li><strong>Gamepad:</strong> left stick or d-pad moves and ducks, <kbd>A</kbd> jumps, <kbd>X</kbd> or <kbd>B</kbd> or a trigger shoots, <kbd>Start</kbd> pauses.</li>
              <li><strong>Touch screen:</strong> use the on-screen d-pad (up jumps, down ducks) and the Fire and Jump buttons.</li>
            </ul>
          </div>
          <div>
            <h3>Collect</h3>
            <ul>
              <li><strong>Breadboards</strong>: every 100 earns a free life. <strong>Rings</strong> upgrade Iggy's suit, and the higher suits learn tricks: <strong>Steel Sentinel</strong> dashes (Shoot when you have no gun), <strong>Night Guardian</strong> ground-pounds (Duck in mid-air) and <strong>Gold Circuit</strong> glides (hold Jump while falling after your double jump).</li>
              <li><strong>Golden breadboard:</strong> each level hides one high above a gap. It is worth 500 points and needs a double jump.</li>
              <li><strong>Golden rings:</strong> jump through them for bonus points. Rings passed in quick succession build a chain worth more each time, up to 100 points a ring.</li>
              <li><strong>Glowing power-ups:</strong> spring legs, magnet, shield, overclock, the golden star and guns.</li>
              <li><strong>Golden star:</strong> Iggy is invincible for 8 seconds. Pylons, walls and enemies are smashed when you touch them, but falling into a gap still costs a life.</li>
              <li><strong>Guns</strong> have a limited number of shots, with no time limit, so you can save them. Grab another gun while you still have shots to upgrade it: blaster, twin blaster, spread gun, then rocket launcher.</li>
            </ul>
          </div>
          <div>
            <h3>Watch out for</h3>
            <ul>
              <li><strong>Sparking pylons</strong> zap you from the side. Land on top of one to smash it and bounce, or shoot it.</li>
              <li><strong>Brick walls</strong> don’t hurt, but crashing through slows you down for a couple of seconds. Land on top to shatter one with no penalty, or shoot it to keep your speed.</li>
              <li><strong>Roof hazards</strong> run on timers and beep before they strike: falling debris (city, hollow and wasteland levels), scalding steam vents (drowned city) and laser beams you must jump over (neon void and spore garden). Move out of the way or time your jump.</li>
              <li><strong>Skeletons and crawlers</strong> patrol the rooftops. Touching one from the side knocks Iggy’s suit down a level (or costs a life if he is already in the Rusty Original). Land on top of them to stomp them, or shoot them.</li>
              <li><strong>Flying enemies</strong> (glow-rays, drones and spore moths in the last three levels) hover above the roofs. When one flashes red it is about to dive at you. Land on top of it to stomp it and bounce, or shoot it.</li>
              <li><strong>Gaps</strong> between buildings cost a life. So does a hit while Iggy wears the Rusty Original. Losing a life sends him back to the last checkpoint in the Rusty Original suit.</li>
            </ul>
          </div>
        </div>
      </section>
      <p aria-live="polite" class="visually-hidden">{{ announcement() }}</p>
      @if (toast()) { <p class="toast" aria-hidden="true">★ Achievement: {{ toast() }}</p> }
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
  /** present (?daily=1) for the daily challenge: a level layout shared by everyone for the day, with its own scoreboard */
  readonly daily = input<string>();
  /** ?mode=endless (no boss, the pace creeps up) or ?mode=time (fixed level, race to the boss, ghost of your best run) */
  readonly mode = input<string>();
  protected readonly gameMode = computed<'story' | 'endless' | 'time'>(() => (this.mode() === 'endless' ? 'endless' : this.mode() === 'time' ? 'time' : 'story'));
  protected readonly fmt = fmtTime;
  /** a short pop-up for a new achievement (it is also read out through the live region) */
  protected readonly toast = signal('');
  private toastTimer = 0;
  private award(list: Achievement[]) {
    if (list.length === 0) return;
    const text = 'Achievement unlocked: ' + list.map((a) => `${a.name}, ${a.how}`).join(' ');
    this.announcement.set(text);
    this.toast.set(list.map((a) => a.name).join(', '));
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toast.set(''), 5000);
  }
  protected story() {
    return levelById(this.level());
  }
  protected title(): string {
    const o = this.overlay();
    if (o === 'intro') return `Level ${this.story().number}: ${this.story().name}`;
    if (o === 'paused') return this.pauseView() === 'options' ? 'Options' : 'Paused';
    if (o === 'complete') return !this.nextLevel() && this.gameMode() === 'story' && !this.isDaily() ? 'You beat the game!' : 'Level complete!';
    return 'Iggy has fallen apart';
  }
  /** story card before a normal level (not before endless, time attack or the daily challenge) */
  private maybeIntro() {
    if (this.settings.settings().storyCards && this.gameMode() === 'story' && !this.isDaily()) this.show('intro');
  }
  protected beginLevel() {
    this.overlay.set('none');
    this.game?.scene.resume('play');
    this.announcement.set('');
    this.host().nativeElement.focus();
  }
  protected hasGhost() {
    return !!this.loadGhost();
  }
  protected readonly isDaily = computed(() => this.daily() !== undefined);
  private seed(): number | null {
    const id = levelById(this.level()).id;
    return this.gameMode() === 'time' ? hash('time:' + id) : this.isDaily() ? dailySeed(id) : null;
  }
  protected board(level: string) {
    return this.gameMode() === 'time' ? `time:${level}` : this.gameMode() === 'endless' ? `endless:${level}` : this.isDaily() ? dailyBoard() : level;
  }
  private ghostKey(level: string) {
    return `iggys-quest.ghost.${level}`;
  }
  private loadGhost(): number[] | null {
    if (this.gameMode() !== 'time') return null;
    try {
      const g = JSON.parse(localStorage.getItem(this.ghostKey(levelById(this.level()).id)) ?? 'null');
      return Array.isArray(g) ? g : null;
    } catch {
      return null;
    }
  }
  /** hand the game the mode, level layout seed and ghost for the next run */
  private applyRun(game: Phaser.Game) {
    game.registry.set('level', levelById(this.level()).id);
    game.registry.set('seed', this.seed());
    game.registry.set('mode', this.gameMode());
    game.registry.set('ghost', this.loadGhost());
  }
  protected readonly overlay = signal<Overlay>('none');
  /** the pause menu shows either its buttons or the options */
  protected readonly pauseView = signal<'main' | 'options'>('main');
  protected readonly label = keyLabel;
  protected keys(a: Action) {
    return this.settings.settings().keys[a];
  }
  protected readonly announcement = signal('');
  protected readonly over = signal<GameOverState | null>(null);
  /** place on the level's high-score table for the run that just ended (null = not in the top five) */
  protected readonly rank = signal<number | null>(null);
  protected readonly progress = inject(ProgressService);
  protected readonly nextLevel = computed(() => {
    const o = this.over();
    const i = LEVELS.findIndex((l) => l.id === o?.level);
    return i >= 0 ? LEVELS[i + 1] : undefined;
  });
  protected readonly hud = signal<HudState>({ level: '', goal: 5000, score: 0, breadboards: 0, lives: 3, nextLifeIn: 100, perfect: true, mode: 'story', time: 0, suit: 'Rusty Original', nextSuit: 'Patchwork', nextSuitNeed: 3, powerUps: [], boss: null });
  private readonly touch: TouchInput = { left: false, right: false, jump: false, fire: false, duck: false };
  /** show the on-screen controls on touch devices, or anywhere with ?controls=1 in the address */
  protected readonly touchUi = signal(false);
  protected readonly pad = signal({ left: false, right: false, up: false, down: false });
  protected readonly btn = signal({ jump: false, fire: false });
  private padPointer: number | null = null;
  private game?: Phaser.Game;

  constructor() {
    // keep the running game in step with the settings (volume, controls, assists) while paused or playing
    effect(() => {
      const st = this.settings.settings();
      const g = this.game;
      if (!g) return;
      g.registry.set('settings', st);
      g.registry.set('music', { on: st.musicOn, volume: st.musicVolume });
    });
    const mq = window.matchMedia('(pointer: coarse)');
    const forced = new URLSearchParams(window.location.search).has('controls');
    this.touchUi.set(mq.matches || forced);
    mq.addEventListener?.('change', (e) => this.touchUi.set(e.matches || forced));
    // The route changed to another level (e.g. "Next level"): reuse the game and restart it on that level.
    effect(() => {
      const id = levelById(this.level()).id;
      const game = this.game;
      const seed = this.seed(), mode = this.gameMode();
      if (!game || (game.registry.get('level') === id && (game.registry.get('seed') ?? null) === seed && game.registry.get('mode') === mode)) return;
      this.applyRun(game);
      this.game?.events.once('hud', () => this.zone.run(() => this.maybeIntro()));
      game.scene.getScene('play').scene.restart();
      this.overlay.set('none');
      this.over.set(null);
      this.rank.set(null);
      this.announcement.set('');
      setTimeout(() => this.host().nativeElement.focus());
    });
    afterNextRender(async () => {
      // Load Phaser lazily so the menu pages stay small.
      const { createGame } = await import('../game/game-host');
      this.game = createGame(this.host().nativeElement, this.settings.settings(), this.touch, levelById(this.level()).id, this.seed(), this.gameMode(), this.loadGhost());
      if (isDevMode()) (window as unknown as { __game?: Phaser.Game }).__game = this.game; // dev-only handle for debugging
      this.game.events.on('hud', (s: HudState) => this.zone.run(() => this.hud.set(s)));
      this.game.events.once('hud', () => this.zone.run(() => this.maybeIntro()));
      this.game.events.on('announce', (t: string) => this.zone.run(() => this.announcement.set(t)));
      this.game.events.on('secret', (id: string) => this.zone.run(() => { this.progress.findSecret(id); this.award(this.progress.milestones()); }));
      this.game.events.on('achieve', (id: string) => this.zone.run(() => this.award(this.progress.award(id))));
      this.game.events.on('complete', (s: GameOverState) =>
        this.zone.run(() => {
          this.over.set(s);
          if (s.mode === 'time') {
            const r = this.progress.record(s.level, this.settings.settings().playerName, s.time, true, false, this.board(s.level));
            this.rank.set(r);
            if (r === 1 && s.trace) {
              try { localStorage.setItem(this.ghostKey(s.level), JSON.stringify(s.trace)); } catch { /* the ghost is a nicety */ }
            }
          } else this.rank.set(this.progress.record(s.level, this.settings.settings().playerName, s.score, true, s.perfect, this.board(s.level)));
          const earned = [...this.progress.milestones()];
          if (s.untouched) earned.push(...this.progress.award('untouched'));
          if (s.mode === 'time') earned.push(...this.progress.award('time'));
          if (s.mode === 'story' && this.isDaily()) earned.push(...this.progress.award('daily'));
          this.award(earned);
          this.show('complete');
        }),
      );
      this.game.events.on('gameover', (s: GameOverState) =>
        this.zone.run(() => {
          this.over.set(s);
          if (s.mode === 'endless' && s.distance >= 2000) this.award(this.progress.award('marathon'));
          this.rank.set(s.mode === 'time' ? null : this.progress.record(s.level, this.settings.settings().playerName, s.score, false, false, this.board(s.level)));
          this.show('gameover');
        }),
      );
      this.host().nativeElement.focus();
      if (Array.from(navigator.getGamepads?.() ?? []).some((g) => g?.connected)) this.startPadWatch();
    });
  }

  /** Plug in a controller: say so, since the game gives no other sign. */
  @HostListener('window:gamepadconnected')
  protected onPadConnected() {
    this.announcement.set('Gamepad connected. Left stick or d-pad moves, A jumps, X or B shoots, Start pauses.');
    this.startPadWatch();
  }

  private padWatch = 0;
  private startStart = false;
  /** The Start button pauses and resumes (the game itself is frozen while paused, so the page watches for it). */
  private startPadWatch() {
    if (this.padWatch) return;
    const tick = () => {
      let down = false;
      try { down = Array.from(navigator.getGamepads?.() ?? []).some((g) => g?.connected && g.buttons[9]?.pressed); } catch { /* no gamepad API */ }
      if (down && !this.startStart) this.onEscape();
      this.startStart = down;
      this.padWatch = requestAnimationFrame(tick);
    };
    this.padWatch = requestAnimationFrame(tick);
  }

  @HostListener('document:keydown.escape')
  protected onEscape() {
    if (this.settings.capturing()) return; // Esc is cancelling a key capture in the options
    if (this.overlay() === 'intro') {
      this.beginLevel();
      return;
    }
    if (this.overlay() === 'paused' && this.pauseView() === 'options') {
      this.pauseView.set('main');
      this.refocus();
    } else if (this.overlay() === 'paused') this.resume();
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

  private triedFullscreen = false;

  /** First press on the touch controls: go fullscreen where the browser allows it (it needs a tap to start). */
  protected enterFullscreenOnce() {
    if (this.triedFullscreen) return;
    this.triedFullscreen = true;
    if (this.canFullscreen && !document.fullscreenElement) void this.screen().nativeElement.requestFullscreen().catch(() => undefined);
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
    this.pauseView.set('main');
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
      this.rank.set(null);
    this.announcement.set('New game');
    if (this.game) this.applyRun(this.game); // a new best ghost may have been saved
    this.game?.scene.getScene('play').scene.restart();
    this.host().nativeElement.focus();
  }

  private show(kind: Exclude<Overlay, 'none'>) {
    if (kind === 'paused') this.game?.scene.pause('play');
    // the story card appears while the scene is still being created, which Phaser won't pause: do it a moment later
    if (kind === 'intro') setTimeout(() => { if (this.overlay() === 'intro') this.game?.scene.pause('play'); }, 60);
    this.overlay.set(kind);
    // Move focus into the dialog once it has rendered.
    setTimeout(() => document.getElementById('ov-title')?.focus());
  }

  /** Move focus back to the dialog heading after its content changed. */
  protected refocus() {
    setTimeout(() => document.getElementById('ov-title')?.focus());
  }

  /** Keep Tab and Shift+Tab inside the open dialog. */
  protected trap(e: Event, back: boolean) {
    const panel = (e.currentTarget as HTMLElement);
    const items = Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="-1"]#ov-title')).filter((el) => el.offsetParent !== null);
    if (items.length === 0) return;
    const first = items[0], last = items[items.length - 1];
    const active = document.activeElement;
    if (back && (active === first || !panel.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!back && (active === last || !panel.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  }

  ngOnDestroy() {
    if (this.padWatch) cancelAnimationFrame(this.padWatch);
    this.game?.destroy(true);
  }
}
