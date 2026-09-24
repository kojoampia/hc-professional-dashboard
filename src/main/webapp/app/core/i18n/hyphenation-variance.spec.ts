import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * That a locale spells a term one way — the single-token half of `../docs/backlog.md` item 187.
 *
 * <p>German wrote both `E-Mail` and bare `Email` (which reads as enamel) in the same catalogues, and
 * no gate saw it: `catalogues.spec.ts` compares keys, `untranslated-literals.spec.ts` checks the
 * screens use them, and `translated-values.spec.ts` proves a value untranslated by it being
 * <i>identical to English</i> — which `Email` in German is, so it reads as a cognate and is skipped.
 * That is not a gap in the sweep; it is what the sweep is. What convicts `Email` is not English but
 * the same catalogue writing `E-Mail` four lines away: <b>a catalogue that spells one term two ways
 * is wrong in one of them</b>, and that contradiction is derivable with no word list.
 *
 * <p><b>The rule:</b> within one locale, two word tokens that become identical after lowercasing and
 * stripping hyphens, but differ with the hyphens kept, are the same term spelled two ways — red,
 * naming the locale, the token and where each spelling lives. Case alone never fires (sentence
 * position capitalises legitimately), and each locale is judged only against itself, so `email` in
 * English and `e-mail` in French can each be their locale's settled form. Keys are identifiers, not
 * copy, and are not scanned.
 *
 * <p><b>What this deliberately does not catch</b> — say it here or the next reader assumes a
 * spelling guard covers spelling:
 *
 * <ul>
 *   <li><b>The compound boundary.</b> `E-Mail Adresse` — every token spelled correctly, only the
 *       compound hyphen missing — passes, because two tokens vs one is invisible to a single-token
 *       rule. Joining word bigrams to close that is where the complexity and the false positives
 *       live (`peut être` / `peut-être` are legitimately both real), and item 187 rejected that
 *       half. Item 184's own eight (`Email Adresse`) <i>would</i> have fired, via their bare
 *       `Email` token, because the locale already wrote the correct standalone `E-Mail` elsewhere
 *       — planted and verified both ways.
 *   <li><b>A consistent wrong spelling.</b> A locale writing bare `Email` in every value fires
 *       nothing — this finds contradiction, not incorrectness. The internal contradiction is the
 *       only evidence a derived check can hold without a maintained word list.
 * </ul>
 *
 * <p><b>There is no allowlist, deliberately.</b> The check passes clean on today's catalogues
 * because item 187 settled each locale on one spelling (de `E-Mail`, en `email`, fr `e-mail`). If a
 * genuinely legitimate pair ever appears — one normalised form that really is two different words —
 * the rule is wrong and should be narrowed, not routed around with a list that invites the next
 * entry in on its precedent (`../docs/backlog.md` items 123 and 178 both refuse that rot).
 */

const I18N_ROOT = resolve(__dirname, '../../../i18n');

/** A word token: letters (any script) with optional single internal hyphens — `E-Mail-Adresse`. */
const TOKEN = /\p{L}+(?:-\p{L}+)+|\p{L}+/gu;

type Catalogue = Record<string, unknown>;

function filesIn(locale: string): string[] {
  return readdirSync(join(I18N_ROOT, locale))
    .filter(name => name.endsWith('.json'))
    .sort();
}

/** Every leaf path and its value, dot-joined, so a hit names the key the fix goes into. */
function entries(value: unknown, prefix = ''): [string, unknown][] {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return Object.entries(value as Catalogue).flatMap(([key, child]) => entries(child, prefix ? `${prefix}.${key}` : key));
  }
  return [[prefix, value]];
}

/** lowercased-surface-form → the locations that write it, grouped by hyphen-stripped form. */
type SpellingGroups = Map<string, Map<string, string[]>>;

function spellingGroups(locale: string): SpellingGroups {
  const groups: SpellingGroups = new Map();
  for (const file of filesIn(locale)) {
    const catalogue = JSON.parse(readFileSync(join(I18N_ROOT, locale, file), 'utf8')) as Catalogue;
    for (const [key, value] of entries(catalogue)) {
      if (typeof value !== 'string') {
        continue;
      }
      for (const token of value.match(TOKEN) ?? []) {
        const spelling = token.toLowerCase();
        const normalised = spelling.replace(/-/g, '');
        const spellings = groups.get(normalised) ?? new Map<string, string[]>();
        groups.set(normalised, spellings);
        const locations = spellings.get(spelling) ?? [];
        spellings.set(spelling, locations);
        locations.push(`i18n/${locale}/${file} → ${key}`);
      }
    }
  }
  return groups;
}

describe('hyphenation variance', () => {
  const locales = readdirSync(I18N_ROOT, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  it('finds the catalogues, so a moved path cannot pass this silently', () => {
    expect(locales.sort()).toEqual(['de', 'en', 'es', 'fr']);
  });

  it('has tokens to compare, so a broken tokeniser cannot pass this suite silently', () => {
    // A variance check over an empty token table asserts nothing at all, quietly and forever. The
    // English catalogues yield well over a thousand distinct tokens today; the threshold is loose
    // so trimming copy does not trip it.
    expect(spellingGroups('en').size).toBeGreaterThan(500);
  });

  it.each(locales)('%s spells each term one way', locale => {
    const found = [...spellingGroups(locale)]
      .filter(([, spellings]) => spellings.size >= 2)
      .map(([normalised, spellings]) => {
        const forms = [...spellings]
          .map(([spelling, locations]) => `"${spelling}" (${locations.slice(0, 3).join(', ')}${locations.length > 3 ? ', …' : ''})`)
          .join(' vs ');
        return (
          `${locale} writes the term "${normalised}" ${spellings.size} ways: ${forms}. One of them is wrong for this ` +
          `locale — settle on one spelling everywhere (item 187 settled email as: de "E-Mail", en "email", fr "e-mail").`
        );
      });

    expect(found).toEqual([]);
  });
});
