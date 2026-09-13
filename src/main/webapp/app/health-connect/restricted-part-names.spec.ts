import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { LANGUAGES } from 'app/config/language.constants';

import { RESTRICTED_PARTS } from './api/restricted-parts';

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
  const notices = (locale: string): Record<string, unknown> => {
    const path = join(__dirname, '..', '..', 'i18n', locale, 'healthConnect.json');
    let node: unknown = JSON.parse(readFileSync(path, 'utf8'));
    for (const key of ['healthConnect', 'patient', 'restricted']) {
      if (typeof node !== 'object' || node === null || !(key in node)) {
        throw new Error(`${path} has no healthConnect.patient.restricted — it stops at '${key}'`);
      }
      node = (node as Record<string, unknown>)[key];
    }
    return node as Record<string, unknown>;
  };

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

  it('says something different about each part in English', () => {
    // One banner covering both was the rejected alternative: `lastActivity` blanks a column on rows
    // that are all present, `caseAssignments` means rows are missing, and a sentence that fits both
    // states neither. If these two ever read the same, the distinction has been lost in the words
    // even though the markup still renders two of them.
    const strings = notices('en');

    expect(new Set(RESTRICTED_PARTS.map(part => strings[part])).size).toBe(RESTRICTED_PARTS.length);
  });
});
