import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CaseStatus } from './health-connect.models';

/**
 * That every case status the server can send has somewhere to land in this app.
 *
 * <h3>The bug this exists for</h3>
 * `CaseStatus` was `'urgent' | 'open' | 'closed'`. patientservice's enum has **four** values — the
 * fourth is `TREATMENT` — so the union was wrong about the wire, and being a union of string
 * literals it could not be checked against anything that arrives over HTTP. Three consequences, none
 * of which failed a build:
 *
 * <ul>
 *   <li>The status column printed `translation-not-found[healthConnect.stats.treatment]` into the
 *       cell, on a clinical queue, in production shape.</li>
 *   <li>`caseCounts` seeded its reducer with three keys, so cases under treatment were counted
 *       <b>nowhere</b> — four of twenty invisible to every figure on the dashboard.</li>
 *   <li>The row tint had no variant for it.</li>
 * </ul>
 *
 * <h3>Why a locale-parity check would not have caught it</h3>
 * All four catalogues were missing the key equally, so they agreed with each other perfectly. Parity
 * between locales only finds drift <em>between</em> translations; it cannot find a key nobody wrote.
 * The fixed point has to be the server's enum, which is what this asserts against.
 *
 * <p>The list below is transcribed from `hc-patient`'s `CaseStatus.java`. It is duplicated by
 * necessity — mobile CI clones one repo and a cross-repo import is not available — so if that enum
 * gains a value, this fails and says which key to add rather than letting it reach a screen.
 */
describe('CaseStatus', () => {
  /** patientservice's enum, lower-cased. Keep in step with hc-patient's `CaseStatus.java`. */
  const SERVER_STATUSES = ['urgent', 'open', 'treatment', 'closed'] as const;

  const localeFile = (locale: string): Record<string, any> =>
    JSON.parse(readFileSync(join(__dirname, '..', '..', 'i18n', locale, 'healthConnect.json'), 'utf8'));

  it('covers every status the server can send', () => {
    // Assigning each server value to the union is the check: an unlisted one fails to compile.
    const assignable: CaseStatus[] = [...SERVER_STATUSES];

    expect(assignable).toHaveLength(SERVER_STATUSES.length);
  });

  it.each(['en', 'es', 'fr', 'de'])('has a %s label for every status', locale => {
    const stats = localeFile(locale).healthConnect.stats;

    const missing = SERVER_STATUSES.filter(status => !stats[status]);
    // Named rather than counted, so a failure says which key to write.
    expect(missing).toEqual([]);
  });

  it.each(['en', 'es', 'fr', 'de'])('has no blank %s label, which renders as an unlabelled cell', locale => {
    const stats = localeFile(locale).healthConnect.stats;

    expect(SERVER_STATUSES.filter(status => String(stats[status] ?? '').trim() === '')).toEqual([]);
  });

  it('translates the statuses differently from one another in English', () => {
    // Guards the lazy fix: adding `treatment: 'Open'` to silence the check above would pass it and
    // put the wrong word on a clinical record.
    const stats = localeFile('en').healthConnect.stats;

    const labels = SERVER_STATUSES.map(status => stats[status]);
    expect(new Set(labels).size).toBe(SERVER_STATUSES.length);
  });
});
