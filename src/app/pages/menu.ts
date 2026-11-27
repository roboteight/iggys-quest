import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { ProgressService } from '../progress.service';
import { BOSSES, LEVELS } from '../game/levels';
import { RouterLink } from '@angular/router';
import { FocusOnLoad } from './focus-heading';
import { dailyBoard, dailyLevel, todayKey } from '../daily';
import { ACHIEVEMENTS } from '../achievements';

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

/** One of Iggy's suits, with what it does. */
interface Suit {
  name: string;
  rings: string;
  does: string;
}

/** A promo painting in /public/art/promo: a wide battle scene. `note` says which suit Iggy wears in it. */
interface Scene {
  file: string;
  name: string;
  note: string;
  alt: string;
}

/** Which sheet belongs to which boss, by level look. */
const BOSS_SHEET: Record<string, string> = {
  city: 'enforcer-nine', hollow: 'grandfather-gloom', wastes: 'dust-scorpion', drowned: 'deep-diver', void: 'neon-warden', spores: 'spore-mother', war: 'iron-marshal', ice: 'icebreaker', dunes: 'dune-dredger', wind: 'gale-warden', locks: 'brass-kraken', sky: 'iron-albatross', plant: 'the-reclaimer', foundry: 'forgemaster',
};

/** Specific descriptions for sheets that have been looked at closely; the others fall back to the boss's one-line blurb. */
const BOSS_ALT: Record<string, string> = {
  foundry: 'Concept art sheet for the Forgemaster, the secret final boss of level 14: a hulking front-on foundry robot in rusted verdigris armour, with a crown of smoking, burning smokestacks, a small iron mask head with one glowing furnace eye, a round crucible belly glowing white-hot behind a grate with three golden circuit-board locks, a huge forge hammer in its right hand and a crane on its left shoulder swinging a ladle that pours molten metal. Smaller drawings show the mask head, the belly with its locks, and a sketch of it stunned with the locks destroyed.',
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

    .landing { width: 100%; max-width: 80rem; margin: 0 auto; padding: 2rem 1.25rem 4rem; display: grid; gap: 4rem; box-sizing: border-box; }
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
    .hero { display: grid; gap: 2.5rem 3rem; align-items: center; grid-template-columns: minmax(0, .7fr) minmax(0, 1.3fr); }
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

    /* the hero plate cycles through the promo battle scenes */
    .hero .plate { justify-self: stretch; width: 100%; }
    .wide img { aspect-ratio: 1024 / 572; }
    .cover img { aspect-ratio: 1024 / 765; }
    .stack { position: relative; display: block; max-width: none; line-height: 0; border: 1px solid var(--line); } /* (not the global .stack column) */
    .stack img { position: absolute; inset: 0; opacity: 0; }
    .stack img.on { position: relative; opacity: 1; }
    @media (prefers-reduced-motion: no-preference) { .stack img { transition: opacity .6s ease; } }
    .suit-now { margin: .6rem 0 .5rem; display: flex; flex-wrap: wrap; align-items: baseline; gap: .2rem .6rem; }
    .suit-now .n { font-family: var(--hand); color: var(--verd); }
    .suit-now strong { font-size: 1.15rem; }
    .suit-now .r { color: var(--muted); font-size: .95rem; }
    .suit-ctl { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
    .dots { list-style: none; display: flex; gap: .4rem; margin: 0; padding: 0; }
    .dot { min-width: 40px; min-height: 40px; padding: 0 .4rem; font: 1rem/1 var(--hand); color: var(--muted); background: transparent; border: 1px solid var(--line-2); border-radius: 2px; cursor: pointer; }
    .dot:hover { color: var(--cream); border-color: var(--verd); }
    .dot[aria-pressed='true'] { color: var(--on-copper); background: var(--copper); border-color: var(--copper); }
    @media (max-width: 60rem) { .hero { grid-template-columns: 1fr; } .hero .plate { order: -1; } }
    /* a wide painting opening a section */
    .banner { margin: 0 0 1.6rem; }

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
    .parts .rings { font-family: var(--hand); color: var(--copper); font-size: 1rem; }
    .note { margin: 1rem 0 0; font-family: var(--hand); color: var(--verd); font-size: 1.05rem; }
    .arsenal.box { grid-template-columns: minmax(0, 1.2fr) minmax(0, .8fr); } /* the box art gets the bigger share */
    @media (max-width: 52rem) { .arsenal, .arsenal.box { grid-template-columns: 1fr; } }

    .features { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); }
    .features li { padding: 1rem 1.15rem; border: 1px solid var(--line); background: var(--plate); }
    .features h3 { margin: .1rem 0 .2rem; font-size: 1.08rem; }
    .features p { margin: 0; font-size: .97rem; color: var(--muted); }
    .ach li.got { border-color: var(--copper); background: var(--plate-2); }
    .ach .state { margin: 0 0 .25rem; font-family: var(--hand); color: var(--verd); }
    .ach li.got .state, .ach li.got .ico { color: var(--copper); }
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
        <figure class="plate wide">
          <p class="fig" aria-hidden="true"><span>Fig. 01: On the road</span><span>Scene {{ scene() + 1 }} / {{ scenes.length }}</span></p>
          <a class="stack" [href]="promo(scenes[scene()].file)" aria-haspopup="dialog" (click)="show($event, promo(scenes[scene()].file), scenes[scene()].alt, scenes[scene()].name)">
            @for (x of scenes; track x.file; let i = $index) {
              <img [src]="promo(x.file)" width="1024" height="572" [attr.fetchpriority]="i === 0 ? 'high' : null" [class.on]="i === scene()" [alt]="i === scene() ? x.alt : ''" [attr.aria-hidden]="i === scene() ? null : 'true'"/>
            }
            <span class="visually-hidden">View the full-size painting: {{ scenes[scene()].name }}</span>
          </a>
          <figcaption>
            <p class="suit-now" aria-live="polite"><span class="n">Scene {{ scene() + 1 }} of {{ scenes.length }}</span> <strong>{{ scenes[scene()].name }}</strong> <span class="r">{{ scenes[scene()].note }}</span></p>
            <div class="suit-ctl">
              <ul class="dots" aria-label="Show a scene">
                @for (x of scenes; track x.file; let i = $index) {
                  <li><button type="button" class="dot" [attr.aria-pressed]="i === scene()" (click)="pick(i)"><span aria-hidden="true">{{ i + 1 }}</span><span class="visually-hidden">{{ x.name }}</span></button></li>
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
                    @if (progress.cleared(l.id)) { <span class="status">Cleared ✓ @if (progress.perfected(l.id)) { · All breadboards collected ★ } @if (progress.flawless(l.id)) { · Perfect run ✦ } · best {{ progress.best(l.id) }}</span> }
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
                    @if (l.id === 'foundry') {
                      <span class="status">Secret level, locked: find the golden breadboard on every level ({{ progress.goldenFound() }} of {{ progress.goldenNeeded() }} found)</span>
                    } @else {
                      <span class="status">Locked: beat the boss of level {{ l.number - 1 }} first</span>
                    }
                  </div>
                }
              </li>
            }
          </ul>
        </nav>
      </section>

      <section aria-labelledby="suits">
        <div class="head"><span class="sec" aria-hidden="true">§ 02</span><h2 id="suits">Iggy’s suits</h2></div>
        <p class="sub">Jump through rings to earn a better suit, and keep it from one level to the next in story mode. Every suit after the first takes a hit or a fall for him, dropping him back one suit instead of costing a life (he keeps his spare rings, so a few more win it back), and keeps the abilities of the suits before it. The Gold Circuit's plating takes one hit before it drops.</p>
        <div class="arsenal box">
          <figure class="plate cover">
            <p class="fig" aria-hidden="true"><span>Fig. 02: The box</span><span>Gold Circuit</span></p>
            <a class="pic" [href]="promo('cover')" aria-haspopup="dialog" (click)="show($event, promo('cover'), coverAlt, 'Iggy’s Quest box art')">
              <img [src]="promo('cover')" width="1024" height="765" loading="lazy" [alt]="coverAlt"/>
              <span class="visually-hidden">View the box art full size</span>
            </a>
          </figure>
          <ol class="parts">
            @for (x of suits; track x.name; let i = $index) {
              <li><span class="no" aria-hidden="true">{{ i + 1 }}</span><h3>{{ x.name }} <span class="rings">· {{ x.rings }}</span></h3><p>{{ x.does }}</p></li>
            }
          </ol>
        </div>
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
        <figure class="plate wide banner">
          <p class="fig" aria-hidden="true"><span>Fig. 05: The line-up</span><span>Gold Circuit</span></p>
          <a class="pic" [href]="promo('scene-bosses')" aria-haspopup="dialog" (click)="show($event, promo('scene-bosses'), bossesAlt, 'The boss mechs')">
            <img [src]="promo('scene-bosses')" width="1024" height="572" loading="lazy" [alt]="bossesAlt"/>
            <span class="visually-hidden">View the painting of the boss mechs full size</span>
          </a>
        </figure>
        <ul class="plates">
          @for (b of bosses; track b.name) { @if (b.level !== 'The Foundry Below' || progress.unlocked('foundry')) {
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
          } }
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

      <section aria-labelledby="accomplishments">
        <div class="head"><span class="sec" aria-hidden="true">§ 07</span><h2 id="accomplishments">Accomplishments</h2></div>
        <p class="sub">{{ earned() }} of {{ achievements.length }} earned. Accomplishments are getting a site of their own soon; for now, here’s what there is to earn.</p>
        <ul class="features ach" style="margin-top:1.1rem">
          @for (a of achievements; track a.id) {
            <li [class.got]="progress.hasAchievement(a.id)">
              <span class="ico" aria-hidden="true">{{ progress.hasAchievement(a.id) ? '★' : '☆' }}</span>
              <h3>{{ a.name }}</h3>
              <p class="state">{{ progress.hasAchievement(a.id) ? 'Earned' : 'Not earned yet' }}</p>
              <p>{{ a.how }}</p>
            </li>
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
export class MenuPage {
  private readonly viewer = viewChild.required<ElementRef<HTMLDialogElement>>('viewer');

  /** The promo battle scenes the hero plate cycles through. */
  protected readonly scenes: Scene[] = [
    { file: 'scene-wastes', name: 'Out in the wastes', note: 'Rusty Original',
      alt: 'Promo painting: Iggy in his Rusty Original suit leaps across a moonlit scrapyard battlefield, firing a spiral blast from his raygun, while skeleton soldiers with rifles, a riveted crawler spider, a snarling rust hound, gearbats, a death-ray manta and a heavy twin-cannon mech close in on him.' },
    { file: 'scene-spores', name: 'The Spore Garden', note: 'Rusty Original',
      alt: 'Promo painting: Rusty Original Iggy fires his raygun across a cavern of glowing mushrooms at the Spore Mother, a towering mech under a domed mushroom cap with a claw arm and a spore cannon, while gearbats swoop overhead and a crawler scuttles at its feet.' },
    { file: 'scene-works', name: 'The ruined works', note: 'Steel Sentinel',
      alt: 'Promo painting: Iggy in heavy riveted Steel Sentinel armour fires a spiral blast through a smoky ruined factory of giant gears and chimneys at skeleton soldiers, a crawler, a rust hound, a bomb-throwing grenadier and a big twin-cannon mech, with a death-ray and gearbats above.' },
    { file: 'scene-glacier', name: 'The Glacier Yards', note: 'Night Guardian',
      alt: 'Promo painting: Iggy in dark Night Guardian armour with amber lamps fires across a snowy yard of icebergs and frozen cranes at skeleton soldiers, a crawler, a rust hound, a drill-armed diving-suit mech and a twin-cannon mech, with a death-ray and gearbats in the stormy sky.' },
    { file: 'scene-skydocks', name: 'The Sky Docks', note: 'Gold Circuit',
      alt: 'Promo painting: Iggy in gold Gold Circuit armour fires a heavy blaster from a rusty platform high above the clouds, among cranes swinging crates, at skeleton soldiers, an armoured mech, a bomb thrower, a crawler and a hound on a catwalk, with gearbats and death-rays in the sky.' },
    { file: 'scene-marshal', name: 'The Iron Marshal', note: 'Rusty Original',
      alt: 'Promo painting: Rusty Original Iggy stumbles backwards across a scaffold in a blazing foundry, firing his raygun at the Iron Marshal, a huge rusted siege tank with a dozer blade, a long cannon and a commander in a peaked cap, as it smashes through the wreckage in a burst of flame.' },
  ];
  protected readonly coverAlt = 'The Iggy’s Quest box art: Iggy in his gold Gold Circuit suit fires his raygun in the foreground under a chrome and orange “Iggy’s Quest” logo. Behind him, under a big moon, skeleton soldiers, crawlers, a rust hound and a burrower bursting out of the ground face him, with the Spore Mother, a twin-cannon mech, the Iron Marshal tank and a death-ray beyond. Labels read “Action series” and “Retro arcade adventure: the ultimate retro sci-fi experience!”';
  protected readonly bossesAlt = 'Promo painting: Gold Circuit Iggy fires his raygun at a line-up of boss mechs on a frozen, burning battlefield: the Iron Marshal tank, the Spore Mother under its mushroom cap, a red-eyed mech, the Deep Diver with its drill arm, Grandfather Gloom’s clock tower and the Dust Scorpion, with a spinning drill top, a burrower, soldiers, a rust hound, gearbats and a death-ray around them.';
  /** a promo painting's address */
  protected promo(file: string) {
    return `art/promo/${file}.webp`;
  }

  /** Iggy's suits in the order he earns them (SUITS in game/art.ts). */
  protected readonly suits: Suit[] = [
    { name: 'Rusty Original', rings: 'Starting suit',
      does: 'No special ability, and he is at his clumsiest: he trips, sheds bolts and puffs smoke. A hit in this suit costs a life.', },
    { name: 'Patchwork', rings: 'Unlocks at 2 rings',
      does: 'Takes a hit for him. Steadier on his feet, though he still trips and sheds parts now and then.', },
    { name: 'Steel Sentinel', rings: 'Unlocks at 5 rings',
      does: 'Dash: press Shoot when he has no gun for a burst forward that smashes pylons, walls and enemies. Hardly rattles.', },
    { name: 'Night Guardian', rings: 'Unlocks at 9 rings',
      does: 'Ground pound: press Duck in mid-air to slam straight down and smash everything nearby. No more tripping or smoke.', },
    { name: 'Gold Circuit', rings: 'Unlocks at 14 rings',
      does: 'Fly: after a double jump, keep holding Jump to rise on jets for about three seconds, then glide down slowly. Landing refuels. Everything finally works, and nothing rattles.', },
  ];
  protected readonly guns = [
    { name: 'Blaster', text: 'Fires one bolt at a time. Shots fly low when he ducks, so they hit crawlers.' },
    { name: 'Twin blaster', text: 'Two bolts side by side with every shot.' },
    { name: 'Spread gun', text: 'Three bolts in a fan, for flyers and anything above or below him.' },
    { name: 'Rocket launcher', text: 'A slower rocket that explodes, smashing everything around where it lands.' },
  ];
  protected readonly arsenalAlt = 'Concept art sheet of Iggy’s arsenal: four retro rayguns in teal steel and brass. 1, the Blaster, with a spiral coil barrel and heat fins. 2, the Twin blaster, with two spiral barrels and a second handle. 3, the Spread gun, with a three-nozzle emitter, a pump fore-end and an external power cell. 4, the Rocket launcher, with a flared exhaust, a scope and a rocket loaded at the front.';

  /** the scene the hero plate is showing; it only changes when the player picks one, so there's nothing to pause */
  protected readonly scene = signal(0);
  protected pick(i: number) {
    this.scene.set(i);
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
  protected readonly achievements = ACHIEVEMENTS;
  protected earned() {
    return this.achievements.filter((a) => this.progress.hasAchievement(a.id)).length;
  }
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
    { icon: '↑', title: 'Upgrade the suit', text: 'Jump through rings to earn five suits, then dash, ground-pound and fly.' },
    { icon: '?', title: 'Secrets everywhere', text: 'Hidden paths, golden breadboards and fireworks for collecting all breadboards.' },
    { icon: '⏱', title: 'Play it your way', text: 'A daily challenge, endless mode and time attack with a ghost of your best run.' },
    { icon: '♿', title: 'Made for everyone', text: 'Remappable keys, gamepad, touch, assist options, reduced motion and screen-reader support.' },
  ];
}
