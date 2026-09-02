import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { LANGUAGES } from 'app/config/language.constants';

import { DUTY_ROSTER_SHIFTS } from './health-connect.models';

/**
 * That every duty-roster shift has a name in every catalogue, and that no catalogue names one the
 * server can no longer send (backlog.md item 8).
 *
 * <p>`ShiftType` is one of the cross-repo invariants `docs/CLAUDE.md` lists, and the four `i18n/`
 * catalogues are its least obvious mirror: every value is a `healthConnect.roster.shiftNames.*` key,
 * resolved by string in `roster-calendar.component`. Nothing links the two, and both directions fail
 * quietly. A new value renders the literal `healthConnect.roster.shiftNames.OFF` mid-screen, because
 * ngx-translate's missing-key handler prints the key and throws nothing. A retired value leaves behind
 * a key that reads perfectly and translates a shift nothing will ever ask for again — which is exactly
 * what DR1 did to `api/.jhipster/DutyRoster.json`, where `MORNING` and `AFTERNOON` survived their own
 * deletion for a fortnight.
 *
 * <p><b>The expectation is derived, never listed.</b> It comes from {@link DUTY_ROSTER_SHIFTS}, and the
 * locales from `LANGUAGES` — which is why that constant is a runtime array with `DutyRosterShift`
 * derived from it rather than the other way round: a union of string literals cannot be enumerated at
 * runtime, so no test can ask it anything. Adding a value to the model fails this spec in all four
 * locales until the catalogues carry it, with nobody having edited this file. A check that names its
 * own coverage stops covering things.
 *
 * <p><b>What this cannot see, and what does.</b> The authority is `ShiftType` in `api/`, and nothing
 * here can read Java. This holds the catalogues to `web/`'s mirror of that enum;
 * `JhipsterEnumFieldValuesTest` in `api/` holds the JHipster generator inputs to the enum itself. The
 * one link still made by hand is `DUTY_ROSTER_SHIFTS` against `ShiftType.values()` — which is what
 * `docs/CLAUDE.md` means by "all of it moves in one change".
 *
 * @see docs/duty-roster.md § 2
 * @see case-status.spec.ts, the same check for patientservice's `CaseStatus`
 */
describe('duty-roster shift names', () => {
  const shiftNames = (locale: string): Record<string, unknown> =>
    (JSON.parse(readFileSync(join(__dirname, '..', '..', 'i18n', locale, 'healthConnect.json'), 'utf8')) as any).healthConnect.roster
      .shiftNames;

  it('has shifts to check', () => {
    // A derived expectation over an empty list asserts nothing at all, quietly and forever.
    expect(DUTY_ROSTER_SHIFTS.length).toBeGreaterThan(0);
  });

  it.each(LANGUAGES)('has a %s name for every shift', locale => {
    // Named rather than counted, so a failure says which key to write.
    expect(DUTY_ROSTER_SHIFTS.filter(shift => !shiftNames(locale)[shift])).toEqual([]);
  });

  it.each(LANGUAGES)('names no shift %s no longer has', locale => {
    const retired = Object.keys(shiftNames(locale)).filter(key => !DUTY_ROSTER_SHIFTS.includes(key as (typeof DUTY_ROSTER_SHIFTS)[number]));

    expect(retired).toEqual([]);
  });

  it.each(LANGUAGES)('has no blank or key-echoing %s name', locale => {
    const names = shiftNames(locale);

    // A key copied into the catalogue to silence the check above passes it and still puts
    // `healthConnect.roster.shiftNames.NIGHT` on the screen.
    expect(DUTY_ROSTER_SHIFTS.filter(shift => String(names[shift]).trim() === '' || String(names[shift]).includes('shiftNames'))).toEqual(
      [],
    );
  });

  it('translates the shifts differently from one another in English', () => {
    const names = shiftNames('en');

    expect(new Set(DUTY_ROSTER_SHIFTS.map(shift => names[shift])).size).toBe(DUTY_ROSTER_SHIFTS.length);
  });
});
