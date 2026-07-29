import { Injectable } from '@angular/core';
import { ParamMap } from '@angular/router';

import { Authority } from 'app/config/authority.constants';
import { LANGUAGES } from 'app/config/language.constants';

export interface CareersHandoff {
  track: string | null;
  locale: string | null;
  src: string | null;
  at: string;
}

const STORAGE_KEY = 'hpd-careers-handoff';

/** Roles the wizard may pre-select from an inbound track parameter. */
const KNOWN_TRACKS = new Set<string>(Object.values(Authority).filter(a => a !== Authority.ADMIN && a !== Authority.USER));

/**
 * Careers → portal handoff (docs/careers-handoff-contract.md).
 *
 * `web.abofonsa.com/careers` links to `/register?track=…&locale=…&src=web-careers`.
 * Registration is anonymous, onboarding is authenticated, and the activation
 * email opens a fresh tab — so the values are carried in localStorage (not
 * sessionStorage) and consumed by the onboarding wizard after sign-in. A
 * cross-device activation loses the value and the wizard degrades to explicit
 * choice, per the contract's graceful-degradation rule. Values outside the
 * known sets are dropped, never errors; no personal data is ever stored here.
 */
@Injectable({ providedIn: 'root' })
export class CareersHandoffService {
  /** Capture valid parameters from the register page; unknown values are dropped. */
  capture(params: ParamMap): CareersHandoff | null {
    const track = params.get('track');
    const locale = params.get('locale');
    const src = params.get('src');

    const validTrack = track !== null && KNOWN_TRACKS.has(track) ? track : null;
    const validLocale = locale !== null && LANGUAGES.includes(locale) ? locale : null;
    const validSrc = src?.trim() ? src.trim().slice(0, 64) : null;

    if (validTrack === null && validLocale === null && validSrc === null) {
      return null;
    }
    const handoff: CareersHandoff = { track: validTrack, locale: validLocale, src: validSrc, at: new Date().toISOString() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(handoff));
    } catch {
      // storage unavailable (private mode etc.) — the wizard degrades to explicit choice
    }
    return handoff;
  }

  peek(): CareersHandoff | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CareersHandoff) : null;
    } catch {
      return null;
    }
  }

  /** Read and clear — called by the wizard once the values have been applied. */
  consume(): CareersHandoff | null {
    const handoff = this.peek();
    this.clear();
    return handoff;
  }

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
