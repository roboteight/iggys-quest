import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LEVELS } from '../game/levels';
import { dailyBoard, dailyLevel, todayKey } from '../daily';
import { fmtTime } from '../format';
import { ACHIEVEMENTS } from '../achievements';
import { ProgressService } from '../progress.service';
import { FocusOnLoad } from './focus-heading';

@Component({
  selector: 'app-scores',
  imports: [RouterLink, FocusOnLoad],
  styles: `
    main { max-width: 46rem; }
    .board { width: 100%; text-align: left; background: var(--panel); border: 2px solid var(--border); border-radius: 14px; padding: .5rem 1.25rem 1rem; }
    h2 { font-size: 1.15rem; margin: .75rem 0 .25rem; }
    h3.sub { font-size: 1rem; margin: 1rem 0 .25rem; }
    table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
    th, td { text-align: left; padding: .3rem .5rem; border-bottom: 1px solid var(--border); }
    th { font-size: .75rem; letter-spacing: .08em; text-transform: uppercase; opacity: .85; }
    td.num, th.num { text-align: right; }
    .empty { margin: .25rem 0 0; opacity: .85; }
  `,
  template: `
    <main class="page">
      <h1 tabindex="-1" appFocusOnLoad>High scores</h1>
      <p class="empty">The five best runs on each level, saved in this browser.</p>
      <section class="board" aria-labelledby="h-ach">
        <h2 id="h-ach">Achievements: {{ earned() }} of {{ achievements.length }}</h2>
        <ul>
          @for (a of achievements; track a.id) {
            <li><strong>{{ a.name }}</strong>: {{ a.how }} <em>{{ progress.hasAchievement(a.id) ? '(Earned ★)' : '(Not yet)' }}</em></li>
          }
        </ul>
      </section>
      <section class="board" aria-labelledby="h-secrets">
        <h2 id="h-secrets">Golden breadboards: {{ found() }} of {{ levels.length }} found</h2>
        <p class="empty">Each level hides one, high above a gap. Look and listen for a shimmer. Find one on every level from 1 to {{ progress.goldenNeeded() }} to open a secret level.</p>
        <ul>
          @for (l of levels; track l.id) {
            <li>Level {{ l.number }}, {{ l.name }}: <strong>{{ progress.secretFound(l.id) ? 'Found ★' : 'Not found yet' }}</strong></li>
          }
        </ul>
      </section>
      <section class="board" aria-labelledby="h-daily">
        <h2 id="h-daily">Daily challenge, {{ today }}: {{ daily.name }}</h2>
        @if (rows(dboard).length) {
          <table>
            <thead><tr><th scope="col">Place</th><th scope="col">Name</th><th scope="col" class="num">Score</th><th scope="col">Result</th><th scope="col">Date</th></tr></thead>
            <tbody>
              @for (e of rows(dboard); track $index) {
                <tr><th scope="row">{{ $index + 1 }}</th><td>{{ e.name }}</td><td class="num">{{ e.score }}</td><td>{{ e.cleared ? 'Beat the boss' : 'Fell apart' }}</td><td>{{ e.date }}</td></tr>
              }
            </tbody>
          </table>
        } @else {
          <p class="empty">No scores yet today.</p>
        }
      </section>
      @for (l of levels; track l.id) {
        <section class="board" [attr.aria-labelledby]="'h-' + l.id">
          <h2 [id]="'h-' + l.id">Level {{ l.number }}: {{ l.name }}</h2>
          @if (rows(l.id).length) {
            <table>
              <thead><tr><th scope="col">Place</th><th scope="col">Name</th><th scope="col" class="num">Score</th><th scope="col">Result</th><th scope="col">Date</th></tr></thead>
              <tbody>
                @for (e of rows(l.id); track $index) {
                  <tr><th scope="row">{{ $index + 1 }}</th><td>{{ e.name }}</td><td class="num">{{ e.score }}</td><td>{{ e.cleared ? 'Beat the boss' : 'Fell apart' }}</td><td>{{ e.date }}</td></tr>
                }
              </tbody>
            </table>
          } @else {
            <p class="empty">No scores yet.</p>
          }
          @for (k of extra(l.id); track k.key) {
            <h3 class="sub">{{ k.title }}</h3>
            <table>
              <thead><tr><th scope="col">Place</th><th scope="col">Name</th><th scope="col" class="num">{{ k.time ? 'Time' : 'Score' }}</th><th scope="col">Date</th></tr></thead>
              <tbody>
                @for (e of rows(k.key); track $index) {
                  <tr><th scope="row">{{ $index + 1 }}</th><td>{{ e.name }}</td><td class="num">{{ k.time ? fmt(e.score) : e.score }}</td><td>{{ e.date }}</td></tr>
                }
              </tbody>
            </table>
          }
        </section>
      }
      <a class="btn" routerLink="/" style="max-width:24rem">Back to menu</a>
    </main>
  `,
})
export class ScoresPage {
  protected readonly progress = inject(ProgressService);
  protected readonly levels = LEVELS;
  protected readonly fmt = fmtTime;
  /** endless and time-attack boards that have entries for a level */
  protected extra(id: string) {
    return [
      { key: `endless:${id}`, title: 'Endless mode', time: false },
      { key: `time:${id}`, title: 'Time attack (fastest)', time: true },
    ].filter((k) => this.rows(k.key).length > 0);
  }
  protected readonly achievements = ACHIEVEMENTS;
  protected earned() {
    return this.achievements.filter((a) => this.progress.hasAchievement(a.id)).length;
  }
  protected found() {
    return this.levels.filter((l) => this.progress.secretFound(l.id)).length;
  }
  protected readonly daily = dailyLevel();
  protected readonly today = todayKey();
  protected readonly dboard = dailyBoard();
  protected rows(id: string) {
    return this.progress.progress().scores[id] ?? [];
  }
}
