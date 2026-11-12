import { Component, ElementRef, OnDestroy, OnInit, inject, signal, viewChild } from '@angular/core';
import { SettingsService } from '../settings.service';
import { ProgressService } from '../progress.service';
import { BOSSES, LEVELS } from '../game/levels';
import { RouterLink } from '@angular/router';
import { FocusOnLoad } from './focus-heading';
import { dailyBoard, dailyLevel, todayKey } from '../daily';

/** One accent colour per level look, used for the stripe on each level card. */
const ACCENT: Record<string, string> = {
  city: '#8fa1c4', hollow: '#b7a1e8', wastes: '#e08a45', drowned: '#4fd1a1', void: '#ff4fd8', spores: '#7dffc0', war: '#e0813a', ice: '#9fd8ff', dunes: '#e8c070', wind: '#86cdbb', locks: '#4fb39a', sky: '#8fc4ff', plant: '#ff6a2a',
};

/** A concept-art sheet in /public/art. The sheets carry their own hand-lettered labels, so the text next to them says the same in words. */
interface Sheet {
  file: string;
  name: string;
  text: string;
  alt: string;
}

/** One of Iggy's suit sheets, with what the suit does. */
interface SuitSheet extends Omit<Sheet, 'text'> {
  rings: string;
  does: string;
}

/** Which sheet belongs to which boss, by level look. */
const BOSS_SHEET: Record<string, string> = {
  city: 'enforcer-nine', hollow: 'grandfather-gloom', wastes: 'dust-scorpion', drowned: 'deep-diver', void: 'neon-warden', spores: 'spore-mother', war: 'iron-marshal', ice: 'icebreaker', dunes: 'dune-dredger', wind: 'gale-warden', locks: 'brass-kraken', sky: 'iron-albatross', plant: 'the-reclaimer',
};

/** Specific descriptions for sheets that have been looked at closely; the others fall back to the boss's one-line blurb. */
const BOSS_ALT: Record<string, string> = {
  plant: 'Concept art sheet for the Reclaimer, the final boss of level 8: a towering rusted smelting machine with twin smokestacks, a domed head studded with glowing orange eyes, a furnace mouth ringed with grinding iron teeth and fed by a conveyor belt, a hydraulic crane arm ending in a crushing claw, a winch swinging a wrecking ball on a chain, and heavy stamping legs. Smaller drawings show the furnace mouth, the eye array, a stamping leg and its scale beside a person.',
  spores: 'Concept art sheet for the Spore Mother, the boss of level 6: a towering riveted mech under a huge domed mushroom cap with gills, glowing orange eyes and a fanged mouth, standing on three heavy hydraulic legs. One arm is a spore emitter and the other a claw with a ground drill. Smaller drawings show its back view, the claw, and a porthole vent.',
};

@Component({
  selector: 'app-menu',
  imports: [RouterLink, FocusOnLoad],
  styles: `
    /* The landing page is a set of technical drawings: a dark blueprint grid, fine verdigris linework with registration marks,
       plates numbered like figures, and the concept art's palette (verdigris, copper, rust, cream and Iggy's orange glow).
       Type: Rubik Dirt (modern, but rusty) for the big headings, Architects Daughter (draughtsman's lettering) for the labels
       and callouts, Space Grotesk for reading. */
    :host {
      --bg: #0b1517; --plate: rgb(127 196 178 / .055); --plate-2: rgb(127 196 178 / .1); --line: #3d6a62; --line-2: #578f85;
      --verd: #86cdbb; --copper: #e09f5c; --rust: #c0602f; --cream: #ece2cc; --muted: #b8b19d; --glow: #ffa45a; --on-copper: #1b1007;
      --display: 'Rubik Dirt', 'Space Grotesk Variable', system-ui, sans-serif;
      --hand: 'Architects Daughter', 'Space Grotesk Variable', system-ui, sans-serif;
      --body: 'Space Grotesk Variable', system-ui, -apple-system, 'Segoe UI', sans-serif;
      display: block; min-height: 100dvh; color: var(--cream); text-align: left; font: 1.03rem/1.6 var(--body);
      background-color: var(--bg);
      background-image:
        radial-gradient(ellipse 70% 45% at 72% 12%, rgb(255 164 90 / .1), transparent 70%),
        linear-gradient(rgb(127 196 178 / .085) 1px, transparent 1px), linear-gradient(90deg, rgb(127 196 178 / .085) 1px, transparent 1px),
        linear-gradient(rgb(127 196 178 / .035) 1px, transparent 1px), linear-gradient(90deg, rgb(127 196 178 / .035) 1px, transparent 1px);
      background-size: auto, 96px 96px, 96px 96px, 16px 16px, 16px 16px;
    }
    :host-context([data-contrast='high']) { --bg: #000; --plate: #000; --plate-2: #000; --line: #fff; --line-2: #fff; --verd: #fff; --copper: #ffd27a; --rust: #fff; --cream: #fff; --muted: #fff; --glow: #ffd27a; background: #000; }
    @media (forced-colors: active) { :host { background: Canvas; color: CanvasText; } }

    .landing { width: 100%; max-width: 74rem; margin: 0 auto; padding: 2rem 1.25rem 4rem; display: grid; gap: 4rem; box-sizing: border-box; }
    .hand { font-family: var(--hand); }
    h1, h2 { font-family: var(--display); font-weight: 400; letter-spacing: .02em; text-transform: uppercase; }
    h3 { font-family: var(--body); font-weight: 700; letter-spacing: .01em; }
    p, li { text-wrap: pretty; }

    /* section heads: a numbered callout with a dimension line running out to the right */
    .head { display: flex; align-items: baseline; gap: .9rem; margin: 0 0 .4rem; }
    .head::after { content: ''; flex: 1; height: 0; border-top: 1px dashed var(--line); transform: translateY(-.35em); }
    .sec { font-family: var(--hand); color: var(--copper); font-size: 1.05rem; white-space: nowrap; }
    h2 { margin: 0; font-size: clamp(1.7rem, 4.2vw, 2.6rem); line-height: 1.05; color: var(--cream); }
    .sub { margin: .2rem 0 1.4rem; max-width: 62ch; color: var(--muted); }

    /* hero */
    .hero { display: grid; gap: 2.5rem 3rem; align-items: center; grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr); }
    .eyebrow { margin: 0 0 .6rem; font-family: var(--hand); font-size: 1.1rem; color: var(--verd); }
    .eyebrow::before { content: '⌖ '; color: var(--copper); }
    h1 { font-size: clamp(3.2rem, 9vw, 6.2rem); line-height: .92; margin: 0 0 1.1rem; color: var(--copper); text-shadow: 0 0 28px rgb(255 164 90 / .25); }
    .tag { margin: 0 0 1.6rem; max-width: 44ch; font-size: 1.2rem; color: var(--cream); }
    .cta { display: flex; flex-wrap: wrap; gap: .8rem; margin-bottom: 1.5rem; }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; width: auto; min-width: 11rem; min-height: 48px; padding: .55rem 1.3rem; box-sizing: border-box;
           font: 600 1rem/1.2 var(--body); letter-spacing: .04em; text-transform: uppercase; text-decoration: none; cursor: pointer;
           color: var(--cream); background: var(--plate); border: 1.5px solid var(--line-2); border-radius: 2px; }
    .btn:hover { border-color: var(--verd); background: var(--plate-2); }
    .btn.primary { background: var(--copper); color: var(--on-copper); border-color: var(--copper); }
    .btn.primary:hover { background: var(--glow); border-color: var(--glow); }
    .btn.big { min-height: 56px; font-size: 1.08rem; padding-inline: 1.7rem; }
    .facts { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: .5rem; }
    .facts li { padding: .2rem .75rem; border: 1px solid var(--line); font-family: var(--hand); font-size: 1rem; color: var(--verd); background: var(--plate); }

    /* a plate: a framed drawing with corner registration marks and a figure label */
    .plate { position: relative; margin: 0; padding: .7rem; border: 1px solid var(--line); background: var(--plate); }
    .plate::before, .plate::after { content: ''; position: absolute; width: 14px; height: 14px; border: 0 solid var(--copper); pointer-events: none; }
    .plate::before { top: -6px; left: -6px; border-top-width: 2px; border-left-width: 2px; }
    .plate::after { bottom: -6px; right: -6px; border-bottom-width: 2px; border-right-width: 2px; }
    .fig { display: flex; justify-content: space-between; gap: 1rem; margin: 0 0 .5rem; font-family: var(--hand); font-size: .95rem; color: var(--verd); line-height: 1.2; }
    .plate a.pic { display: block; line-height: 0; border: 1px solid var(--line); }
    .plate img { display: block; width: 100%; height: auto; aspect-ratio: 765 / 1024; object-fit: cover; background: #1a2a28; }
    @media (prefers-reduced-motion: no-preference) { .plate a.pic { transition: transform .15s, box-shadow .15s; } .plate a.pic:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgb(0 0 0 / .45); } }

    /* the hero plate cycles through Iggy's suits */
    .hero .plate { justify-self: center; width: min(26rem, 100%); }
    .stack { position: relative; display: block; line-height: 0; border: 1px solid var(--line); }
    .stack img { position: absolute; inset: 0; opacity: 0; }
    .stack img.on { position: relative; opacity: 1; }
    @media (prefers-reduced-motion: no-preference) { .stack img { transition: opacity .6s ease; } }
    .suit-now { margin: .6rem 0 .5rem; display: flex; flex-wrap: wrap; align-items: baseline; gap: .2rem .6rem; }
    .suit-now .n { font-family: var(--hand); color: var(--verd); }
    .suit-now strong { font-size: 1.15rem; }
    .suit-now .r { color: var(--muted); font-size: .95rem; }
    .suit-ctl { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
    .suit-ctl .btn { min-width: 6.5rem; min-height: 40px; padding: .3rem .8rem; font-size: .9rem; }
    .dots { list-style: none; display: flex; gap: .4rem; margin: 0; padding: 0; }
    .dot { min-width: 40px; min-height: 40px; padding: 0 .4rem; font: 1rem/1 var(--hand); color: var(--muted); background: transparent; border: 1px solid var(--line-2); border-radius: 2px; cursor: pointer; }
    .dot:hover { color: var(--cream); border-color: var(--verd); }
    .dot[aria-pressed='true'] { color: var(--on-copper); background: var(--copper); border-color: var(--copper); }
    @media (max-width: 52rem) { .hero { grid-template-columns: 1fr; } .hero .plate { order: -1; width: min(21rem, 100%); } }

    /* grids of plates */
    .plates { list-style: none; margin: 0; padding: 0; display: grid; gap: 2.2rem 1.6rem; grid-template-columns: repeat(auto-fill, minmax(15.5rem, 1fr)); }
    .plates > li { display: flex; flex-direction: column; gap: .8rem; }
    .caption h3 { margin: 0 0 .2rem; font-size: 1.2rem; }
    .caption p { margin: 0; font-size: .98rem; color: var(--muted); }
    .caption .where { margin: 0 0 .15rem; font-family: var(--hand); font-size: 1rem; color: var(--copper); }

    /* the arsenal: one wide plate beside a parts list */
    .arsenal { display: grid; gap: 2rem; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); align-items: start; }
    .parts { list-style: none; margin: 0; padding: 0; display: grid; gap: .8rem; counter-reset: part; }
    .parts li { display: grid; grid-template-columns: 2.4rem 1fr; gap: .2rem .9rem; padding: .85rem 1rem; border: 1px solid var(--line); background: var(--plate); }
    .parts .no { grid-row: span 2; display: grid; place-items: center; width: 2.4rem; height: 2.4rem; border: 1.5px solid var(--copper); border-radius: 50%; font: 1.1rem/1 var(--hand); color: var(--copper); }
    .parts h3 { margin: 0; font-size: 1.1rem; }
    .parts p { margin: 0; color: var(--muted); font-size: .97rem; }
    .note { margin: 1rem 0 0; font-family: var(--hand); color: var(--verd); font-size: 1.05rem; }
    @media (max-width: 52rem) { .arsenal { grid-template-columns: 1fr; } }

    .features { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); }
    .features li { padding: 1rem 1.15rem; border: 1px solid var(--line); background: var(--plate); }
    .features h3 { margin: .1rem 0 .2rem; font-size: 1.08rem; }
    .features p { margin: 0; font-size: .97rem; color: var(--muted); }
    .ico { display: inline-grid; place-items: center; min-width: 2.1rem; height: 2.1rem; padding: 0 .3rem; box-sizing: border-box; border: 1.5px solid var(--copper); border-radius: 50%; font: 1.05rem/1 var(--hand); color: var(--copper); }

    /* levels */
    .grid { list-style: none; margin: 0; padding: 0; width: 100%; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr)); }
    .grid > li { display: flex; flex-direction: column; gap: .5rem; }
    .grid > li > .card { flex: 1; }
    .modes { display: flex; gap: .5rem; margin: 0; }
    .modes .btn { flex: 1; min-width: 0; min-height: 44px; padding: .2rem .5rem; font-size: .85rem; }
    .card { position: relative; display: grid; gap: .25rem; height: 100%; box-sizing: border-box; padding: 1.1rem 1.1rem 1rem 1.35rem; text-decoration: none; color: var(--cream);
            background: var(--plate); border: 1px solid var(--line); min-height: 44px; }
    .card::before { content: ''; position: absolute; inset: -1px auto -1px -1px; width: 5px; background: var(--c); }
    .card:hover { background: var(--plate-2); border-color: var(--verd); }
    .num { font-family: var(--hand); font-size: .98rem; color: var(--verd); }
    .name { font-size: 1.2rem; font-weight: 700; }
    .blurb { font-size: .96rem; color: var(--muted); }
    .status { font-size: .9rem; font-weight: 600; color: var(--cream); }
    .locked { border-style: dashed; color: var(--muted); }
    .start { font-family: var(--hand); color: var(--copper); font-size: 1rem; }
    .bottom { display: flex; gap: .9rem; flex-wrap: wrap; justify-content: center; }

    /* the full-size viewer */
    .viewer { width: min(96vw, 62rem); max-width: none; max-height: 96dvh; padding: .75rem; border: 1px solid var(--line-2); border-radius: 2px; background: #0f1c1d; color: var(--cream); box-shadow: 0 20px 60px rgb(0 0 0 / .7); overflow: auto; }
    .viewer::backdrop { background: rgb(4 10 11 / .86); }
    .viewer-bar { display: flex; align-items: center; gap: 1rem; margin-bottom: .6rem; }
    .viewer-bar h2 { margin: 0; font-size: 1.4rem; }
    .viewer .btn { min-width: 6rem; }
    .viewer img { display: block; margin: 0 auto; max-width: 100%; max-height: calc(96dvh - 6.5rem); width: auto; height: auto; }

    a:focus-visible, button:focus-visible { outline: 3px solid var(--glow); outline-offset: 3px; }
    @media (forced-colors: active) {
      .card, .btn, .facts li, .features li, .plate, .parts li, .dot, .viewer, .stack, .plate a.pic { border-color: CanvasText; }
      .btn.primary, .dot[aria-pressed='true'] { background: ButtonText; color: ButtonFace; }
      .plate::before, .plate::after { border-color: CanvasText; }
    }
  `,
  template: `
    <main class="landing">
      <section class="hero" aria-labelledby="title">
        <div class="copy">
          <p class="eyebrow">A side-scrolling robot platformer</p>
          <h1 id="title" tabindex="-1" appFocusOnLoad>Iggy’s Quest</h1>
          <p class="tag">Help Iggy, an old and very clumsy robot, run home across thirteen strange worlds. Jump through rings to upgrade his suit, dodge the shells and beat every boss mech on the way.</p>
          <div class="cta">
            <a class="btn primary big" [routerLink]="['/play', next().id]">{{ started() ? 'Continue: ' + next().name : 'Play now' }}</a>
            <a class="btn big" routerLink="/daily">Daily challenge</a>
          </div>
          <ul class="facts" aria-label="Highlights">
            <li>13 worlds</li><li>16 kinds of enemy</li><li>13 boss mechs</li><li>5 suits</li><li>4 guns</li><li>Keyboard, gamepad and touch</li><li>Works offline</li>
          </ul>
        </div>
        <figure class="plate" (mouseenter)="hold = true" (mouseleave)="hold = false" (focusin)="hold = true" (focusout)="hold = false">
          <p class="fig" aria-hidden="true"><span>Fig. 01: Iggy</span><span>Suit {{ suit() + 1 }} / {{ suits.length }}</span></p>
          <a class="stack" [href]="'art/' + suits[suit()].file + '.webp'" aria-haspopup="dialog" (click)="show($event, 'art/' + suits[suit()].file + '.webp', suits[suit()].alt, suits[suit()].name)">
            @for (x of suits; track x.file; let i = $index) {
              <img [src]="'art/' + x.file + '.webp'" width="765" height="1024" [class.on]="i === suit()" [alt]="i === suit() ? x.alt : ''" [attr.aria-hidden]="i === suit() ? null : 'true'"/>
            }
            <span class="visually-hidden">View the full-size concept sheet for {{ suits[suit()].name }}</span>
          </a>
          <figcaption>
            <p class="suit-now" [attr.aria-live]="playing() ? 'off' : 'polite'"><span class="n">Suit {{ suit() + 1 }} of {{ suits.length }}</span> <strong>{{ suits[suit()].name }}</strong> <span class="r">{{ suits[suit()].rings }}</span></p>
            <div class="suit-ctl">
              <button type="button" class="btn" (click)="togglePlay()">{{ playing() ? 'Pause' : 'Play' }}<span class="visually-hidden"> the suit slideshow</span></button>
              <ul class="dots" aria-label="Show a suit">
                @for (x of suits; track x.file; let i = $index) {
                  <li><button type="button" class="dot" [attr.aria-pressed]="i === suit()" (click)="pick(i)"><span aria-hidden="true">{{ i + 1 }}</span><span class="visually-hidden">{{ x.name }}</span></button></li>
                }
              </ul>
            </div>
          </figcaption>
        </figure>
      </section>

      <section aria-labelledby="levels">
        <div class="head"><span class="sec" aria-hidden="true">§ 01</span><h2 id="levels">Choose a level</h2></div>
        <nav aria-label="Levels" style="margin-top:1.1rem">
          <ul class="grid">
            <li>
              <a class="card" [style.--c]="accent(daily.style)" routerLink="/daily">
                <span class="num">Daily challenge · {{ today }}</span>
                <span class="name">Today: {{ daily.name }}</span>
                <span class="blurb">The same level layout for everyone today, with its own high-score table.</span>
                @if (progress.best(board)) { <span class="status">Best today {{ progress.best(board) }}</span> } @else { <span class="start">Play today’s level →</span> }
              </a>
            </li>
            @for (l of levels; track l.id) {
              <li>
                @if (progress.unlocked(l.id)) {
                  <a class="card" [style.--c]="accent(l.style)" [routerLink]="['/play', l.id]">
                    <span class="num">Level {{ l.number }}</span>
                    <span class="name">{{ l.name }}</span>
                    <span class="blurb">{{ l.blurb }}</span>
                    @if (progress.cleared(l.id)) { <span class="status">Cleared ✓ @if (progress.perfected(l.id)) { · Perfect ★ } · best {{ progress.best(l.id) }}</span> }
                    @else if (progress.best(l.id)) { <span class="status">Best {{ progress.best(l.id) }}</span> }
                    @else if (l.number === 1) { <span class="start">Start here →</span> }
                  </a>
                  <div class="modes" role="group" [attr.aria-label]="'Other ways to play level ' + l.number">
                    <a class="btn" [routerLink]="['/play', l.id]" [queryParams]="{ mode: 'endless' }">Endless<span class="visually-hidden"> mode, level {{ l.number }}</span></a>
                    <a class="btn" [routerLink]="['/play', l.id]" [queryParams]="{ mode: 'time' }">Time attack<span class="visually-hidden">, level {{ l.number }}</span></a>
                  </div>
                } @else {
                  <div class="card locked" [style.--c]="accent(l.style)">
                    <span class="num">Level {{ l.number }}</span>
                    <span class="name">{{ l.name }}</span>
                    <span class="status">Locked: beat the boss of level {{ l.number - 1 }} first</span>
                  </div>
                }
              </li>
            }
          </ul>
        </nav>
      </section>

      <section aria-labelledby="suits">
        <div class="head"><span class="sec" aria-hidden="true">§ 02</span><h2 id="suits">Iggy’s suits</h2></div>
        <p class="sub">Jump through rings to earn a better suit, and keep it from one level to the next in story mode. Every suit after the first takes a hit for him, dropping him back one suit instead of costing a life, and keeps the abilities of the suits before it.</p>
        <ul class="plates">
          @for (x of suits; track x.file; let i = $index) {
            <li>
              <figure class="plate">
                <p class="fig" aria-hidden="true"><span>Fig. 02.{{ i + 1 }}</span><span>{{ x.rings }}</span></p>
                <a class="pic" [href]="'art/' + x.file + '.webp'" aria-haspopup="dialog" (click)="show($event, 'art/' + x.file + '.webp', x.alt, x.name)">
                  <img [src]="'art/' + x.file + '.webp'" width="765" height="1024" loading="lazy" [alt]="x.alt"/>
                  <span class="visually-hidden">View the full-size concept sheet for {{ x.name }}</span>
                </a>
              </figure>
              <div class="caption"><p class="where">{{ x.rings }}</p><h3>{{ x.name }}</h3><p>{{ x.does }}</p></div>
            </li>
          }
        </ul>
      </section>

      <section aria-labelledby="arsenal">
        <div class="head"><span class="sec" aria-hidden="true">§ 03</span><h2 id="arsenal">Iggy’s arsenal</h2></div>
        <p class="sub">Grab a blaster crate to arm Iggy. Every crate after that, while he still has ammo, upgrades the gun one step.</p>
        <div class="arsenal">
          <figure class="plate">
            <p class="fig" aria-hidden="true"><span>Fig. 03: Arsenal</span><span>4 guns</span></p>
            <a class="pic" href="art/iggy-arsenal.webp" aria-haspopup="dialog" (click)="show($event, 'art/iggy-arsenal.webp', arsenalAlt, 'Iggy’s arsenal')">
              <img src="art/iggy-arsenal.webp" width="765" height="1024" loading="lazy" [alt]="arsenalAlt"/>
              <span class="visually-hidden">View the full-size concept sheet for Iggy’s arsenal</span>
            </a>
          </figure>
          <div>
            <ol class="parts">
              @for (g of guns; track g.name; let i = $index) {
                <li><span class="no" aria-hidden="true">{{ i + 1 }}</span><h3>{{ g.name }}</h3><p>{{ g.text }}</p></li>
              }
            </ol>
            <p class="note">Hold Shoot to charge a bigger shot, then let go.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="meet">
        <div class="head"><span class="sec" aria-hidden="true">§ 04</span><h2 id="meet">Meet the trouble</h2></div>
        <p class="sub">Patrols, chargers, bombers, flyers, thieves and worse. The concept sheets carry the details; the notes here say what each one does and how to beat it.</p>
        <ul class="plates">
          @for (e of enemies; track e.file; let i = $index) {
            <li>
              <figure class="plate">
                <p class="fig" aria-hidden="true"><span>Fig. 04.{{ i + 1 }}</span><span>Enemy</span></p>
                <a class="pic" [href]="'art/' + e.file + '.webp'" aria-haspopup="dialog" (click)="show($event, 'art/' + e.file + '.webp', e.alt, e.name)">
                  <img [src]="'art/' + e.file + '.webp'" width="765" height="1024" loading="lazy" [alt]="e.alt"/>
                  <span class="visually-hidden">View the full-size concept sheet for {{ e.name }}</span>
                </a>
              </figure>
              <div class="caption"><h3>{{ e.name }}</h3><p>{{ e.text }}</p></div>
            </li>
          }
        </ul>
      </section>

      <section aria-labelledby="bosses">
        <div class="head"><span class="sec" aria-hidden="true">§ 05</span><h2 id="bosses">The boss mechs</h2></div>
        <p class="sub">One waits at the end of every world, with its own attacks and its own music.</p>
        <ul class="plates">
          @for (b of bosses; track b.name) {
            <li>
              <figure class="plate">
                <p class="fig" aria-hidden="true"><span>Fig. 05.{{ b.number }}</span><span>Boss</span></p>
                <a class="pic" [href]="'art/' + b.file + '.webp'" aria-haspopup="dialog" (click)="show($event, 'art/' + b.file + '.webp', b.alt, b.name)">
                  <img [src]="'art/' + b.file + '.webp'" width="765" height="1024" loading="lazy" [alt]="b.alt"/>
                  <span class="visually-hidden">View the full-size concept sheet for {{ b.name }}</span>
                </a>
              </figure>
              <div class="caption"><p class="where">Level {{ b.number }}: {{ b.level }}</p><h3>{{ b.name }}</h3><p>{{ b.text }}</p></div>
            </li>
          }
        </ul>
      </section>

      <section aria-labelledby="features">
        <div class="head"><span class="sec" aria-hidden="true">§ 06</span><h2 id="features">What’s inside</h2></div>
        <ul class="features" style="margin-top:1.1rem">
          @for (f of features; track f.title) {
            <li><span class="ico" aria-hidden="true">{{ f.icon }}</span><h3>{{ f.title }}</h3><p>{{ f.text }}</p></li>
          }
        </ul>
      </section>

      <div class="bottom"><a class="btn" routerLink="/scores">High scores and achievements</a><a class="btn" routerLink="/settings">Settings and controls</a></div>

      <dialog #viewer class="viewer" aria-labelledby="viewer-title" (click)="backdropClick($event)" (close)="closed()">
        <div class="viewer-bar">
          <button type="button" class="btn" (click)="close()">Close</button>
          <h2 id="viewer-title">{{ current()?.name }}</h2>
        </div>
        @if (current(); as c) {
          <img [src]="c.src" [alt]="c.alt"/>
        }
      </dialog>
    </main>
  `,
})
export class MenuPage implements OnInit, OnDestroy {
  private readonly viewer = viewChild.required<ElementRef<HTMLDialogElement>>('viewer');
  private readonly settings = inject(SettingsService);

  /** Iggy's suits in the order he earns them (SUITS in game/art.ts); the hero plate cycles through their sheets. */
  protected readonly suits: SuitSheet[] = [
    { file: 'iggy', name: 'Rusty Original', rings: 'Starting suit',
      does: 'No special ability, and he is at his clumsiest: he trips, sheds bolts and puffs smoke. A hit in this suit costs a life.',
      alt: 'Concept art sheet for Iggy in his Rusty Original suit: a tall retro robot in cream and weathered teal metal with copper bands, a glass dome helmet holding a little green alien robot, a spring antenna with a bulb, a chest panel of dials, a tool belt and a raygun holster. Smaller drawings show his back, the raygun and the chest meter.' },
    { file: 'iggy-patchwork', name: 'Patchwork', rings: 'Unlocks at 3 rings',
      does: 'Takes a hit for him. Steadier on his feet, though he still trips and sheds parts now and then.',
      alt: 'Concept art sheet for Patchwork Iggy: mismatched welded armour in rust, teal and brass, a ribbed brass shoulder plate, a reinforced dome cage with two antennae and a headlamp, a scrap battery, a scavenger tool strapped to one arm and tread boots. Smaller drawings show his back, the shoulder plate, the dome and the gauge cluster.' },
    { file: 'iggy-steel-sentinel', name: 'Steel Sentinel', rings: 'Unlocks at 8 rings',
      does: 'Dash: press Shoot when he has no gun for a burst forward that smashes pylons, walls and enemies. Hardly rattles.',
      alt: 'Concept art sheet for Steel Sentinel Iggy: heavy riveted steel armour with bulky shoulder plates, a caged glass dome with a coiled transceiver, a shield plate on one forearm, a blaster arm with a copper coil and heavy hydraulic stomping boots. Smaller drawings show his back, the Sentinel blaster and a boot.' },
    { file: 'iggy-night-guardian', name: 'Night Guardian', rings: 'Unlocks at 15 rings',
      does: 'Ground pound: press Duck in mid-air to slam straight down and smash everything nearby. No more tripping or smoke.',
      alt: 'Concept art sheet for Night Guardian Iggy: dark steel night-patrol armour with glowing amber lamps, a searchlight on the shoulder, a caged glass dome, a chain hanging from the belt and heavily weighted impact boots. Smaller drawings show his back, the night-ops blaster and a boot.' },
    { file: 'iggy-gold-circuit', name: 'Gold Circuit', rings: 'Unlocks at 25 rings',
      does: 'Glide: hold Jump while falling after a double jump to float down slowly. Everything finally works, and nothing rattles.',
      alt: 'Concept art sheet for Gold Circuit Iggy: gold and brass armour traced with glowing orange circuit lines, an ornate dome cage with coiled antennas and a beacon, amber lamps, a searchlight and heavy stabilising boots. Smaller drawings show his back, the gold blaster and a boot.' },
  ];
  protected readonly guns = [
    { name: 'Blaster', text: 'Fires one bolt at a time. Shots fly low when he ducks, so they hit crawlers.' },
    { name: 'Twin blaster', text: 'Two bolts side by side with every shot.' },
    { name: 'Spread gun', text: 'Three bolts in a fan, for flyers and anything above or below him.' },
    { name: 'Rocket launcher', text: 'A slower rocket that explodes, smashing everything around where it lands.' },
  ];
  protected readonly arsenalAlt = 'Concept art sheet of Iggy’s arsenal: four retro rayguns in teal steel and brass. 1, the Blaster, with a spiral coil barrel and heat fins. 2, the Twin blaster, with two spiral barrels and a second handle. 3, the Spread gun, with a three-nozzle emitter, a pump fore-end and an external power cell. 4, the Rocket launcher, with a flared exhaust, a scope and a rocket loaded at the front.';

  /** the suit the hero plate is showing, and whether it moves on by itself (it doesn't with reduced motion) */
  protected readonly suit = signal(0);
  protected readonly playing = signal(!this.reduceMotion());
  /** paused while the pointer is over the plate or focus is inside it, so nothing changes under someone looking or tabbing */
  protected hold = false;
  private timer = 0;

  ngOnInit() {
    this.timer = window.setInterval(() => {
      if (this.playing() && !this.hold && !document.hidden && !this.current()) this.suit.update((i) => (i + 1) % this.suits.length);
    }, 5000);
  }
  ngOnDestroy() {
    window.clearInterval(this.timer);
  }
  private reduceMotion() {
    return this.settings.settings().reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  protected togglePlay() {
    this.playing.update((p) => !p);
  }
  /** choosing a suit stops the slideshow on it */
  protected pick(i: number) {
    this.suit.set(i);
    this.playing.set(false);
  }
  protected readonly current = signal<{ src: string; alt: string; name: string } | null>(null);

  /** Open a concept sheet full size. Without scripting the link still opens the image itself. */
  protected show(e: Event, src: string, alt: string, name: string) {
    e.preventDefault();
    this.current.set({ src, alt, name });
    const d = this.viewer().nativeElement;
    if (typeof d.showModal !== 'function') { window.open(src, '_blank', 'noopener'); return; }
    document.documentElement.style.overflow = 'hidden'; // keep the page from scrolling behind the dialog
    d.showModal();
  }
  protected close() {
    this.viewer().nativeElement.close();
  }
  /** a click on the dim area around the picture closes it */
  protected backdropClick(e: MouseEvent) {
    if (e.target === this.viewer().nativeElement) this.close();
  }
  protected closed() {
    document.documentElement.style.overflow = '';
    this.current.set(null);
  }

  protected readonly daily = dailyLevel();
  protected readonly today = todayKey();
  protected readonly board = dailyBoard();
  protected readonly levels = LEVELS;
  protected readonly progress = inject(ProgressService);
  protected accent(style: string) {
    return ACCENT[style] ?? '#ffd23f';
  }
  /** the level to jump back into: the first unlocked level that is not cleared yet */
  protected next() {
    return this.levels.find((l) => this.progress.unlocked(l.id) && !this.progress.cleared(l.id)) ?? this.levels[this.levels.length - 1];
  }
  protected started() {
    return this.levels.some((l) => this.progress.cleared(l.id) || this.progress.best(l.id) > 0);
  }

  protected readonly enemies: Sheet[] = [
    { file: 'skeleton-soldier', name: 'Skeleton soldiers', text: 'They patrol the rooftops and trenches. Land on their heads to stomp them, or shoot them.',
      alt: 'Concept art sheet for the Skeleton-Soldier: a mechanical skeleton in a dented soldier’s helmet with a glowing orange ribcage, carrying a retro rifle with a bayonet. Smaller drawings show its back, ribcage and knee joint.' },
    { file: 'crawler', name: 'Crawlers', text: 'Low, quick and sneaky. Duck to shoot them, because standing shots fly right over.',
      alt: 'Concept art sheet for the Crawler: a riveted, rusty mech tarantula with a cluster of glowing orange eyes, fangs, a gun under its mandibles and spiked, multi-jointed legs. Smaller drawings show its eyes, a spiked leg and the front pincers.' },
    { file: 'death-ray', name: 'Death-rays', text: 'Riveted metal manta rays that hover above the roofs and dive when they flash red. Stomp them or shoot them.',
      alt: 'Concept art sheet for the Death Ray: a riveted, weathered metal manta ray with glowing orange eyes, a segmented stinger tail and an under-mounted emitter dish. Smaller drawings show the emitter, the stinger and the wing plating.' },
    { file: 'rust-hound', name: 'Rust Hounds', text: 'Fast, low robot dogs that charge the moment they spot Iggy. Their springy legs coil when they land, so stomp them then.',
      alt: 'Concept art sheet for the Rust Hound: a low-slung robot dog of rusty, teal-patched scrap metal with a spiked back, a crushing jaw, a glowing orange eye and a chain-segmented tail. Smaller drawings show its charging pose, its skull and a coiled spring leg joint.' },
    { file: 'grenadier', name: 'Grenadiers', text: 'Armoured bombers with a lobber arm and an ammo hopper on their backs. They throw fused bombs in high arcs, and a bomb can be shot down in flight.',
      alt: 'Concept art sheet for the Grenadier: a heavily armoured skeleton-faced robot in a grate helmet with a spring-loaded lobber arm, a bandolier and a hopper of fuse-lit bombs on its back. Smaller drawings show its back and a single round bomb.' },
    { file: 'shield-guard', name: 'Shield Guards', text: 'They hide behind a huge round shield that bounces shots away. Jump on the flat head, or get round behind them to the exposed gears.',
      alt: 'Concept art sheet for the Shield Guard: a bulky, spiked robot in a flat-topped helmet behind a massive round riveted shield, with sparks bouncing off it. Smaller drawings show the shield, the exposed rear gears and the vulnerable head.' },
    { file: 'gearbat', name: 'Gearbats', text: 'Erratic flyers with spinning, gear-spoked wings and chain-segmented tails. They swoop in wild arcs, so wait for the gap.',
      alt: 'Concept art sheet for the Gearbat: a bat-like flying robot with a skull face, glowing orange eyes, ragged gear-spoked wings, small rocket vents and a chain-segmented tail. Smaller drawings show its wing, head, pincer claws and back view.' },
    { file: 'burrower', name: 'Burrowers', text: 'Drill-nosed digging mechs that burst up out of the ground ahead of Iggy. Watch the dirt move, then get clear.',
      alt: 'Concept art sheet for the Burrower: a hulking, riveted mech with a massive spiral drill nose, huge excavator claws and a turbine engine venting smoke, bursting out of rubble. Smaller drawings show the drill, a claw and a rear view.' },
    { file: 'gloop-tender', name: 'Gloop Tenders', text: 'Tracked tanks that spray puddles of glue across the roofs. Step in one and Iggy is stuck at half speed for a moment, so jump the puddles, then shoot the drum or stomp the tank.',
      alt: 'Concept art sheet for the Gloop Tender: a squat, riveted robot on tank tracks with a pressurised glue drum and copper pipes on its back, orange eyes, and a heavy nozzle arm dripping amber glue. Smaller drawings show the glue drum, sticky track prints, its rear exhaust and the nozzle.' },
    { file: 'rivet-zeppelin', name: 'Rivet Zeppelins', text: 'Patched airships that cross the sky now and then, dropping a line of fuse-lit bombs. Watch the gaps between the bombs, or shoot one down for big points.',
      alt: 'Concept art sheet for the Rivet Zeppelin: a patched, riveted metal gasbag over a sturdy gondola with a glowing window, twin smoking propeller engines and an open bomb bay dropping a round fuse-lit bomb. Smaller drawings show the bomb bay, a propeller and a bomb.' },
    { file: 'glitch-mite', name: 'Glitch Mites', text: 'Floating viral orbs that drift towards Iggy. A touch jams his gun and suit tricks for a few seconds. Stomp them, because a shot splits one into two smaller mites.',
      alt: 'Concept art sheet for the Glitch Mite: a faceted, riveted orb in teal patina with glowing neon-green circuit lines, a crackling green core, copper wiring and spiky data tendrils. Smaller drawings show it splitting in two, its rear thrusters and a tendril.' },
    { file: 'copycat-unit', name: 'Copycat Units', text: 'Faceless mannequin robots that wake as Iggy passes and follow his exact path a second behind him, until their battery runs flat and they fall apart. Keep moving and don’t double back.',
      alt: 'Concept art sheet for the Copycat Unit: a slender, jointed mannequin robot with a blank domed head, one glowing red eye and a draining battery gauge on its chest. Smaller drawings show its back, the collapsed robot after its battery dies, and the eye and gauge.' },
    { file: 'scrap-magnet', name: 'Scrap Magnets', text: 'Crane robots that stand at the edge of a gap. When their coils glow they pull Iggy towards them, and towards the drop. Jump while they are off, or shoot them.',
      alt: 'Concept art sheet for the Scrap Magnet: a riveted crane robot on four anchor legs with a hydraulic arm holding a huge horseshoe electromagnet, its copper coils glowing and sparking. Smaller drawings show the magnetic pull from above, the generator and the magnet poles.' },
    { file: 'pogo-trooper', name: 'Pogo Troopers', text: 'Skeleton soldiers riding a single giant spring, bouncing in high arcs. Stomp them only when the spring is squashed at the bottom of a bounce, or shoot them.',
      alt: 'Concept art sheet for the Pogo Trooper: a mechanical skeleton in a dented helmet with glowing orange eyes, a bandolier and a retro rifle with a bayonet, riding a single heavy coil spring. Smaller drawings show its back, the squashed and stretched spring and its landing foot.' },
    { file: 'rivet-rats', name: 'Rivet Rats', text: 'Little scrap rats that scurry along the edges of cliffs. Harmless on the roof, but if Iggy hangs from their edge they bite his fingers and he lets go, so climb up fast.',
      alt: 'Concept art sheet for the Rivet Rats: small rat-shaped robots of rusty scrap with plier jaws, glowing amber eyes and segmented wire tails, a pack of them on a roof edge beside a gloved hand hanging from it. Smaller drawings show the jaw, the eye sensors, the tail and pack tactics.' },
    { file: 'magpie-drone', name: 'Magpie Drones', text: 'Chattering bird drones that swoop in and steal breadboards before Iggy reaches them. They never hurt him; shoot one and everything it took comes back.',
      alt: 'Concept art sheet for the Magpie Drone: a bird-shaped robot with teal and brass feathered wings, a claw beak, a glowing amber eye and a cargo sack of stolen scrap slung under it. Smaller drawings show the beak, the eye sensor, its talons and its swooping flight path.' },
  ];

  protected readonly bosses = LEVELS.map((l) => ({
    file: BOSS_SHEET[l.style],
    name: BOSSES[l.style].name,
    text: BOSSES[l.style].blurb,
    number: l.number,
    level: l.name,
    alt: BOSS_ALT[l.style] ?? `Concept art sheet for ${BOSSES[l.style].name}, the boss of level ${l.number}: ${BOSSES[l.style].blurb}`,
  }));

  protected readonly features: { icon: string; title: string; text: string }[] = [
    { icon: '13', title: 'Thirteen strange worlds', text: 'Rooftops and trenches, ice, glass dunes, a wind-torn gorge, flooded locks, docks in the sky, and the furnace at the end of the road.' },
    { icon: '★', title: 'A boss mech at every end', text: 'Each one attacks differently and has its own music. Power-ups drop from the sky.' },
    { icon: '↑', title: 'Upgrade the suit', text: 'Jump through rings to earn five suits, then dash, ground-pound and glide.' },
    { icon: '?', title: 'Secrets everywhere', text: 'Hidden paths, golden breadboards and perfect-run fireworks for the thorough.' },
    { icon: '⏱', title: 'Play it your way', text: 'A daily challenge, endless mode and time attack with a ghost of your best run.' },
    { icon: '♿', title: 'Made for everyone', text: 'Remappable keys, gamepad, touch, assist options, reduced motion and screen-reader support.' },
  ];
}
