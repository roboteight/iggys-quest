import { ApplicationRef, Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { filter, first } from 'rxjs';

/** How often an open tab asks the server whether a new version has been deployed. */
const CHECK_EVERY_MS = 30 * 60 * 1000;

/**
 * Watches the service worker for a newly deployed version and offers a reload.
 * The notice never interrupts play: the root banner hides while the play page is open,
 * and the play page shows its own notice inside its pause, intro and results panels.
 */
@Injectable({ providedIn: 'root' })
export class UpdateService {
  private readonly sw = inject(SwUpdate);

  /** A new version has downloaded and is waiting for a reload. */
  readonly ready = signal(false);
  /** The play page is open, so the root banner must stay out of the way. */
  readonly inGame = signal(false);
  /** The player chose "Later" on the banner (for this visit). */
  readonly dismissed = signal(false);

  constructor() {
    if (!this.sw.isEnabled) return; // dev server, or a browser without service workers
    this.sw.versionUpdates.pipe(filter((e) => e.type === 'VERSION_READY')).subscribe(() => this.ready.set(true));
    // The cached copy is broken (for example the server dropped files it still needs): start fresh.
    this.sw.unrecoverable.subscribe(() => location.reload());

    const check = () => { if (!this.ready()) this.sw.checkForUpdate().catch(() => {}); };
    inject(ApplicationRef).isStable.pipe(first((stable) => stable)).subscribe(() => {
      check();
      setInterval(check, CHECK_EVERY_MS);
    });
    // Coming back to a tab that sat in the background is a good moment to look again.
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  }

  /** Switch to the new version and reload the page. */
  async reload() {
    try { await this.sw.activateUpdate(); } catch { /* reload anyway: it picks up the new version */ }
    location.reload();
  }
}
