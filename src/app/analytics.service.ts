import { Injectable, isDevMode, signal } from '@angular/core';

/**
 * The Google Analytics 4 measurement ID (Admin → Data streams → the web stream), e.g. "G-ABC123XYZ9".
 * Leave it empty and analytics stays off: no banner, no setting, nothing loads.
 */
export const GA_ID = 'G-4VFVWQ71LF';

const KEY = 'iggys-quest.analytics';
export type Consent = 'granted' | 'denied' | null;

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; [key: `ga-disable-${string}`]: boolean }
}

function loadConsent(): Consent {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

/**
 * Google Analytics, only with the player's say-so. Nothing from Google loads until they accept,
 * the choice is remembered in this browser, and turning it off later removes the cookies.
 * Page views (including moves between app routes) are counted by GA4's own enhanced measurement.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  /** Off on the dev server and on local copies, so testing never shows up in the numbers. */
  readonly available = !!GA_ID && !isDevMode() && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  readonly consent = signal<Consent>(loadConsent());
  private loaded = false;

  constructor() {
    if (this.available && this.consent() === 'granted') this.start();
  }

  set(choice: 'granted' | 'denied') {
    this.consent.set(choice);
    try { localStorage.setItem(KEY, choice); } catch { /* remembered for this visit only */ }
    if (!this.available) return;
    if (choice === 'granted') this.start();
    else this.stop();
  }

  private start() {
    window[`ga-disable-${GA_ID}`] = false;
    if (this.loaded) {
      window.gtag?.('consent', 'update', { analytics_storage: 'granted' });
      return;
    }
    this.loaded = true;
    window.dataLayer = window.dataLayer ?? [];
    // gtag has to push the real `arguments` object, which is why this isn't an arrow function.
    window.gtag = function () { window.dataLayer!.push(arguments); }; // eslint-disable-line prefer-rest-params
    window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);
  }

  private stop() {
    window[`ga-disable-${GA_ID}`] = true;
    window.gtag?.('consent', 'update', { analytics_storage: 'denied' });
    // Remove Google Analytics' cookies (_ga, _ga_XXXX), set on this host and on the parent domain.
    const host = location.hostname;
    const domains = ['', host, '.' + host, '.' + host.split('.').slice(-2).join('.')];
    for (const c of document.cookie.split(';')) {
      const name = c.split('=')[0].trim();
      if (!name.startsWith('_ga')) continue;
      for (const d of domains) document.cookie = `${name}=; Max-Age=0; path=/${d ? '; domain=' + d : ''}`;
    }
  }
}
