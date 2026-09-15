import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { LANGUAGES } from 'app/config/language.constants';

import { RECORD_RESTRICTED_PARTS, RESTRICTED_PARTS, ROW_REMOVING_PARTS } from './api/restricted-parts';

/**
 * That every restricted part the directory can be handed has a sentence in every catalogue, and
 * that no locale is carrying English in place of one (backlog.md item 114).
 *
 * <p>The point of the whole item is that a clinician be *told* a part was withheld rather than left
 * to read a blank column as a quiet caseload. On three of the four locales, an untranslated string
 * is indistinguishable from that same defect wearing a different coat: ngx-translate renders the
 * key itself, so `healthConnect.patient.restricted.lastActivity` appears mid-screen with nothing
 * thrown and nothing logged, and the English build looks perfect.
 *
 * <p><b>The expectation is derived from {@link RESTRICTED_PARTS}, never listed here.</b> The day
 * `api/` names a third part and this client learns to recognise it, all four locales go red until
 * they carry it, with nobody having edited this file. `shift-names.spec.ts` beside this one is the
 * same shape for the same reason.
 *
 * <p><b>Why this exists when `core/i18n/catalogues.spec.ts` already compares key sets.</b> Parity
 * is a weaker claim than it looks: four catalogues agree perfectly when somebody pastes the English
 * sentence into the other three, and that is the likeliest way a locale lags — the keys are all
 * present, every parity check is green, and a French clinician is told in English that part of
 * their patient list is missing. So the last check below compares *values*, which parity cannot.
 */
describe('restricted-part notices', () => {
  /**
   * The `healthConnect.patient.restricted` block of one locale's catalogue.
   *
   * Walked key by key rather than read through `as any`, so a reorganised catalogue names the path
   * that moved instead of failing with `Cannot read properties of undefined`.
   */
  const block = (locale: string, ...path: string[]): Record<string, unknown> => {
    const file = join(__dirname, '..', '..', 'i18n', locale, 'healthConnect.json');
    let node: unknown = JSON.parse(readFileSync(file, 'utf8'));
    for (const key of path) {
      if (typeof node !== 'object' || node === null || !(key in node)) {
        throw new Error(`${file} has no ${path.join('.')} — it stops at '${key}'`);
      }
      node = (node as Record<string, unknown>)[key];
    }
    return node as Record<string, unknown>;
  };

  /** The directory's notices: one per part, plus the marker the recency column shows. */
  const notices = (locale: string): Record<string, unknown> => block(locale, 'healthConnect', 'patient', 'restricted');

  /**
   * The record's notices, a separate block because the record needs its own sentence.
   *
   * <p>The token is the same `lastActivity`; the loss is not. On the list it blanks a column, on a
   * record it withholds every activity entry and the last-activity date with them — so the list's
   * sentence, printed here, would say that recency sorting is unavailable while the patient's whole
   * activity history is missing. `backlog.md` item 129 names that trap; the last check below is it,
   * made into a guard.
   */
  const recordNotices = (locale: string): Record<string, unknown> => block(locale, 'healthConnect', 'patient', 'recordRestricted');

  /**
   * The dashboard's notices, a third block for a third loss.
   *
   * <p>Keyed by part like the other two, but it carries a sentence only for the parts that remove
   * **rows**: those are the ones that make a count wrong, and a count is all these cards are. The
   * screen prints one in place of the four figures rather than beside them, so the sentence has to
   * account for their absence — which neither of the other two blocks does.
   */
  const dashboardNotices = (locale: string): Record<string, unknown> => block(locale, 'healthConnect', 'dashboard', 'restricted');

  /** Every key this feature renders: one notice per part, plus the marker the recency column shows. */
  const REQUIRED_KEYS = [...RESTRICTED_PARTS, 'lastActivityCell'];

  it('has parts to check', () => {
    // A derived expectation over an empty list asserts nothing at all, quietly and forever.
    expect(RESTRICTED_PARTS.length).toBeGreaterThan(0);
  });

  it.each(LANGUAGES)('has a %s sentence for every part, and for the column marker', locale => {
    // Named rather than counted, so a failure says which key to write.
    expect(REQUIRED_KEYS.filter(key => !notices(locale)[key])).toEqual([]);
  });

  it.each(LANGUAGES)('carries no %s key for a part this client would not render', locale => {
    // The mirror of the check above. A token dropped from RESTRICTED_PARTS leaves a sentence that
    // reads perfectly and is shown to nobody — the shape `MORNING` and `AFTERNOON` left behind.
    const stray = Object.keys(notices(locale)).filter(key => !REQUIRED_KEYS.includes(key));

    expect(stray).toEqual([]);
  });

  it.each(LANGUAGES)('has no blank or key-echoing %s sentence', locale => {
    const strings = notices(locale);
    const echoes = (value: string, key: string): boolean => value === key || value.includes('healthConnect.patient.restricted');

    expect(REQUIRED_KEYS.filter(key => String(strings[key]).trim() === '' || echoes(String(strings[key]), key))).toEqual([]);
  });

  it.each(LANGUAGES.filter(locale => locale !== 'en'))('says it in %s rather than repeating the English', locale => {
    // The check key parity cannot make. These are whole sentences, not a proper noun that reads the
    // same everywhere, so any of them matching English means that locale was left behind — the
    // "English now, translations later" state this repo does not have.
    const english = notices('en');
    const strings = notices(locale);

    expect(REQUIRED_KEYS.filter(key => strings[key] === english[key])).toEqual([]);
  });

  describe('the record screen (backlog item 126)', () => {
    it('has parts to check', () => {
      expect(RECORD_RESTRICTED_PARTS.length).toBeGreaterThan(0);
    });

    it.each(LANGUAGES)('has a %s sentence for every part the record can be refused', locale => {
      expect(RECORD_RESTRICTED_PARTS.filter(part => !recordNotices(locale)[part])).toEqual([]);
    });

    it.each(LANGUAGES)('carries no %s key for a part the record cannot be refused', locale => {
      // `caseAssignments` is the live case: it cannot reach `GET /api/patients/{id}` at all, because
      // a caller refused the case collection is refused the whole record. A sentence for it here
      // would read perfectly and be shown to nobody.
      const recordParts: readonly string[] = RECORD_RESTRICTED_PARTS;
      const stray = Object.keys(recordNotices(locale)).filter(key => !recordParts.includes(key));

      expect(stray).toEqual([]);
    });

    it.each(LANGUAGES)('has no blank or key-echoing %s sentence', locale => {
      const strings = recordNotices(locale);
      const bad = RECORD_RESTRICTED_PARTS.filter(
        part => String(strings[part]).trim() === '' || String(strings[part]).includes('healthConnect.patient'),
      );

      expect(bad).toEqual([]);
    });

    it.each(LANGUAGES.filter(locale => locale !== 'en'))('says it in %s rather than repeating the English', locale => {
      const english = recordNotices('en');
      const strings = recordNotices(locale);

      expect(RECORD_RESTRICTED_PARTS.filter(part => strings[part] === english[part])).toEqual([]);
    });

    it.each(LANGUAGES)('does not reuse the %s list sentence for the record', locale => {
      // Item 129's trap, as a guard. Copying the directory's string into the record is the cheap
      // way to ship this feature and it writes a new false sentence while removing one: "no
      // last-activity date is shown for any patient" describes a column, not a withheld history.
      // Every locale, because a copy made in one catalogue is as wrong as a copy made in four.
      const list = notices(locale);
      const record = recordNotices(locale);

      expect(RECORD_RESTRICTED_PARTS.filter(part => record[part] === list[part] || record[part] === list.lastActivityCell)).toEqual([]);
    });
  });

  describe("the dashboard's demographic cards (backlog item 125)", () => {
    /**
     * Every key that screen can print: one per row-removing part, plus the one for a part it could
     * not name at all.
     *
     * <p>`unknown` is not a part and never will be. It is what the screen says when
     * {@link parseRestrictedParts} dropped a token: the dropped part may be row-removing, in which
     * case the figures are short and nothing in the bundle can say why. Listed by hand because
     * nothing can derive it — there is no array of the tokens this client has not heard of.
     */
    const DASHBOARD_KEYS = [...ROW_REMOVING_PARTS, 'unknown'];

    it('has parts to check', () => {
      expect(ROW_REMOVING_PARTS.length).toBeGreaterThan(0);
    });

    it.each(LANGUAGES)('has a %s sentence for every part that breaks a count, and for the unnameable one', locale => {
      expect(DASHBOARD_KEYS.filter(key => !dashboardNotices(locale)[key])).toEqual([]);
    });

    it.each(LANGUAGES)('carries no %s key for a part that leaves the counts standing', locale => {
      // `lastActivity` is the live case: it blanks a field no card reads, so the figures are shown
      // and nothing is said. A sentence for it here would be shown to nobody — or worse, would be
      // found later and wired up, suppressing four correct numbers.
      const stray = Object.keys(dashboardNotices(locale)).filter(key => !DASHBOARD_KEYS.includes(key));

      expect(stray).toEqual([]);
    });

    it.each(LANGUAGES)('has no blank or key-echoing %s sentence', locale => {
      const strings = dashboardNotices(locale);
      const bad = DASHBOARD_KEYS.filter(
        key => String(strings[key]).trim() === '' || String(strings[key]).includes('healthConnect.dashboard'),
      );

      expect(bad).toEqual([]);
    });

    it.each(LANGUAGES.filter(locale => locale !== 'en'))('says it in %s rather than repeating the English', locale => {
      const english = dashboardNotices('en');
      const strings = dashboardNotices(locale);

      expect(DASHBOARD_KEYS.filter(key => strings[key] === english[key])).toEqual([]);
    });

    it.each(LANGUAGES)('tells a named refusal apart from an unnameable one in %s', locale => {
      // Two different claims, and the difference is what a reader can act on: one knows what was
      // withheld, the other knows only that something was. If they ever read alike, the screen has
      // stopped distinguishing "your role may not read case assignments" from "this portal is older
      // than the service answering it" — conditions with different remedies and different owners.
      const strings = dashboardNotices(locale);

      expect(new Set(DASHBOARD_KEYS.map(key => strings[key])).size).toBe(DASHBOARD_KEYS.length);
    });

    it.each(LANGUAGES)('does not reuse the %s list sentence on the dashboard', locale => {
      // Item 129's trap again, and here the token is *the same one* the directory has a sentence
      // for, so copying it across is a single keystroke. The two say different things: on the
      // directory the list in front of the clinician is short but usable, on the dashboard there is
      // no figure at all — "this list is incomplete" printed over four missing cards describes
      // neither.
      const list = notices(locale);
      const dashboard = dashboardNotices(locale);

      expect(ROW_REMOVING_PARTS.filter(part => dashboard[part] === list[part])).toEqual([]);
    });
  });

  it('says something different about each part in English', () => {
    // One banner covering both was the rejected alternative: `lastActivity` blanks a column on rows
    // that are all present, `caseAssignments` means rows are missing, and a sentence that fits both
    // states neither. If these two ever read the same, the distinction has been lost in the words
    // even though the markup still renders two of them.
    const strings = notices('en');

    expect(new Set(RESTRICTED_PARTS.map(part => strings[part])).size).toBe(RESTRICTED_PARTS.length);
  });
});
