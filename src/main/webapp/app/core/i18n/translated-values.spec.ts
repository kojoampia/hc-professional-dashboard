import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { LANGUAGES } from 'app/config/language.constants';

/**
 * That the other three catalogues say things in their own language — the value-level gate beside
 * the key-level ones (`../docs/backlog.md` item 123).
 *
 * <p>The three gates this file joins are all about **keys**: `catalogues.spec.ts` compares the key
 * sets, `untranslated-literals.spec.ts` proves the screens use them, `brand-terms.spec.ts` holds
 * what the values name. None of them compares a value against the English, so "translated" and
 * "present in all four files" are different claims and every gate tests the second while the
 * four-languages rule promises the first: paste the English sentence into `es/`, `fr/` and `de/`
 * and everything stays green — demonstrated during item 114, where exactly that mutation left the
 * 265 key-level cases passing and only `restricted-part-names.spec.ts`'s hand-scoped value check
 * red.
 *
 * <p><b>The rule: a locale's PROSE must differ from the English; single words are out of scope.</b>
 * The scoping is derived, not enumerated, and it is `restricted-part-names.spec.ts`'s own rule made
 * general: <i>these are whole sentences, not a proper noun that reads the same everywhere, so any
 * of them matching English means that locale was left behind.</i> A blanket differs-from-English
 * rule fails on cognates — measured on these catalogues (2026-09-24, 814 English leaves), es
 * carries 34 values identical to English, fr 81 and de 66, and at one to three words they are
 * overwhelmingly words that genuinely read the same (`Date`, `Message`, `Menu`, `Patients`,
 * `Session`, `District`, `Documents`…). French's excess in particular is cognates, not
 * untranslated strings, which is why identical-to-English alone is far too weak a signal to gate
 * on there. At four or more words the signal is clean: the only identical prose in any locale is
 * the two JHipster needle strings below, whose own text reads "(do not translate!)". So the
 * threshold sits where the measured false positives stop, not at a guess. The residue below it is
 * <b>known and occupied, not merely theoretical</b> — `global.title`, the browser tab, ships
 * identical in fr and de today and is no cognate, and an identical-here-translated-there sweep of
 * the 2–3-word band found ~75 candidates of which a handful are genuine — but pinning those would
 * take a cognate allowlist of dozens, exactly the rot this file refuses, so they are the content
 * row filed from item 123's review, and a short string's sameness is unexamined here, not
 * endorsed.
 *
 * <p><b>Identical-to-English is evidence, not proof.</b> A failure here has found a candidate for
 * review, not convicted anyone: the honest reading of a hit is "this sentence was probably left in
 * English", and the message says how to clear it either way — translate it, or record in
 * {@link PROVEN_IDENTICAL} the argument that it truly reads the same in that locale.
 *
 * <p>Compared per file rather than through the merge model, deliberately: `catalogues.spec.ts`
 * already proves per-file key parity and owns the model of `MergeJsonWebpackPlugin`'s odd
 * resolution rules, so a second copy of that model here could only drift from it. A failure names
 * the file the sentence lives in, which is where the fix goes.
 */

const I18N_ROOT = resolve(__dirname, '../../../i18n');

/** The locales this app ships, minus the generator needle in the constant. */
const LOCALES = LANGUAGES.filter(language => !language.startsWith('jhipster-needle'));

/** Words in a sentence for a four-word threshold: split on whitespace, placeholders count. */
const words = (value: string): number => value.trim().split(/\s+/).length;

/**
 * The measured boundary between prose and cognate (see the docblock). Below it the identical
 * strings are proper nouns and shared words; at it and above, on today's catalogues, they are the
 * two generator needles and nothing else.
 */
const MIN_PROSE_WORDS = 4;

/**
 * Values proven to read identically in every locale, each with its argument written beside it.
 *
 * <p><b>Two entries, and both justify themselves in their own text.</b> Anything else legitimately
 * identical is under four words and already outside the rule, so an entry here needs a reason a
 * reviewer can check — like these two, whose value literally instructs "(do not translate!)". If
 * entries accumulate, the scoping rule is wrong: fix the rule rather than growing the list, which
 * is how `untranslated-literals.spec.ts`'s `EXEMPT_FILES` filled up before item 12 emptied it.
 */
const PROVEN_IDENTICAL: { file: string; key: string; why: string }[] = [
  {
    file: 'global.json',
    key: 'global.menu.jhipster-needle-menu-add-element',
    why: 'a JHipster generator needle, not copy — its own text reads "(do not translate!)" and the generator matches it verbatim',
  },
  {
    file: 'global.json',
    key: 'global.menu.admin.jhipster-needle-menu-add-admin-element',
    why: 'a JHipster generator needle, not copy — its own text reads "(do not translate!)" and the generator matches it verbatim',
  },
];

type Catalogue = Record<string, unknown>;

function filesIn(locale: string): string[] {
  return readdirSync(join(I18N_ROOT, locale))
    .filter(name => name.endsWith('.json'))
    .sort();
}

function read(locale: string, file: string): Catalogue {
  return JSON.parse(readFileSync(join(I18N_ROOT, locale, file), 'utf8')) as Catalogue;
}

/** Every leaf path *and its value*, dot-joined, so a check can look at what a key actually says. */
function entries(value: unknown, prefix = ''): [string, unknown][] {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return Object.entries(value as Catalogue).flatMap(([key, child]) => entries(child, prefix ? `${prefix}.${key}` : key));
  }
  return [[prefix, value]];
}

describe('translated values', () => {
  it('has prose to check, so a broken word count cannot pass this suite silently', () => {
    // A derived expectation over an empty list asserts nothing at all, quietly and forever. The
    // English catalogues carry 216 prose strings today; well over 100 unless something is wrong
    // with the counting, and the threshold is loose so trimming copy does not trip it.
    const prose = filesIn('en')
      .flatMap(file => entries(read('en', file)))
      .filter(([, value]) => typeof value === 'string' && words(value) >= MIN_PROSE_WORDS);

    expect(prose.length).toBeGreaterThan(100);
  });

  it.each(LOCALES.filter(locale => locale !== 'en'))('says its prose in %s rather than repeating the English', locale => {
    const candidates = filesIn('en').flatMap(file => {
      const exempt = new Set(PROVEN_IDENTICAL.filter(entry => entry.file === file).map(entry => entry.key));
      const other = new Map(entries(read(locale, file)));

      return entries(read('en', file))
        .filter(
          ([key, value]) => typeof value === 'string' && words(value) >= MIN_PROSE_WORDS && other.get(key) === value && !exempt.has(key),
        )
        .map(
          ([key, value]) =>
            `i18n/${locale}/${file} → ${key} reads word-for-word as the English does ("${String(value)}") — a candidate ` +
            `for review, not a proven error. Either say it in ${locale}, or add it to PROVEN_IDENTICAL with the reason ` +
            `it genuinely reads the same there.`,
        );
    });

    expect(candidates).toEqual([]);
  });

  it('exempts only values that still need exempting', () => {
    // The rot-guard, so the list cannot outlive its own argument: an entry whose value has since
    // been translated everywhere, or whose key is gone, is dead weight that invites the next entry
    // in on its precedent.
    const stale = PROVEN_IDENTICAL.filter(({ file, key }) => {
      const value = new Map(entries(read('en', file))).get(key);
      return (
        typeof value !== 'string' ||
        words(value) < MIN_PROSE_WORDS ||
        !LOCALES.filter(locale => locale !== 'en').some(locale => new Map(entries(read(locale, file))).get(key) === value)
      );
    });

    expect(stale).toEqual([]);
  });
});
