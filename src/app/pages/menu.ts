import { Component, inject } from '@angular/core';
import { ProgressService } from '../progress.service';
import { LEVELS } from '../game/levels';
import { RouterLink } from '@angular/router';
import { FocusOnLoad } from './focus-heading';
import { dailyBoard, dailyLevel, todayKey } from '../daily';

/** One accent colour per level look, used for the stripe and number badge on each card. */
const ACCENT: Record<string, string> = {
  city: '#8fa1c4', hollow: '#b7a1e8', wastes: '#e08a45', drowned: '#4fd1a1', void: '#ff4fd8', spores: '#7dffc0',
};

@Component({
  selector: 'app-menu',
  imports: [RouterLink, FocusOnLoad],
  styles: `
    h1 { font-size: clamp(2.4rem, 7vw, 4rem); line-height: 1.05; letter-spacing: -.01em; color: var(--accent); text-shadow: 0 4px 0 rgb(0 0 0 / .45); }
    .tag { margin: 0; max-width: 42ch; font-size: 1.1rem; opacity: .92; }
    .grid { list-style: none; margin: .75rem 0 0; padding: 0; width: 100%; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr)); }
    .grid > li { display: flex; flex-direction: column; gap: .4rem; }
    .grid > li > .card { flex: 1; }
    .modes { display: flex; gap: .5rem; margin: 0; }
    .modes .btn { flex: 1; min-height: 44px; padding: .25rem .5rem; font-size: .9rem; }
    .card { position: relative; display: grid; gap: .25rem; height: 100%; padding: 1.1rem 1.1rem 1rem 1.1rem; text-align: left; text-decoration: none; color: var(--fg);
            background: var(--panel); border: 2px solid var(--border); border-radius: 14px; overflow: hidden; min-height: 44px; }
    .card::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 6px; background: var(--c); }
    .card:hover { border-color: var(--c); }
    @media (prefers-reduced-motion: no-preference) { .card { transition: transform .12s, border-color .12s; } .card:hover { transform: translateY(-3px); } }
    .num { font-size: .75rem; letter-spacing: .1em; text-transform: uppercase; color: var(--c); font-weight: 700; }
    .name { font-size: 1.2rem; font-weight: 700; }
    .blurb { font-size: .95rem; opacity: .88; }
    .status { font-size: .85rem; font-weight: 700; }
    .locked { opacity: .6; border-style: dashed; }
    .start { color: var(--accent); font-size: .8rem; font-weight: 700; }
    .bottom { display: flex; gap: .75rem; flex-wrap: wrap; justify-content: center; width: 100%; margin-top: .5rem; }
    .bottom .btn { width: auto; min-width: 12rem; }
    @media (forced-colors: active) { .card { border-color: ButtonText; } .card:hover { border-color: Highlight; } }
  `,
  template: `
    <main class="page">
      <h1 tabindex="-1" appFocusOnLoad>Iggy’s Quest</h1>
      <p class="tag">Help Iggy, an old and very clumsy robot, run across the rooftops of strange places. Jump through rings to upgrade his suit, and beat each level's boss mech to open the next.</p>
      <nav aria-label="Levels" style="width:100%">
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
                <p class="modes" [attr.aria-label]="'Other ways to play level ' + l.number">
                  <a class="btn" [routerLink]="['/play', l.id]" [queryParams]="{ mode: 'endless' }">Endless<span class="visually-hidden"> mode, level {{ l.number }}</span></a>
                  <a class="btn" [routerLink]="['/play', l.id]" [queryParams]="{ mode: 'time' }">Time attack<span class="visually-hidden">, level {{ l.number }}</span></a>
                </p>
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
      <div class="bottom"><a class="btn" routerLink="/scores">High scores</a><a class="btn" routerLink="/settings">Settings</a></div>
    </main>
  `,
})
export class MenuPage {
  protected readonly daily = dailyLevel();
  protected readonly today = todayKey();
  protected readonly board = dailyBoard();
  protected readonly levels = LEVELS;
  protected readonly progress = inject(ProgressService);
  protected accent(style: string) {
    return ACCENT[style] ?? '#ffd23f';
  }
}
