import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { LANGUAGES } from 'app/config/language.constants';

/**
 * The four `i18n/` catalogues must hold exactly the same keys.
 *
 * <p>This is the `web/` half of the gate `mobile/` has had since MOB11 (`catalogues.spec.ts` there).
 * It needs to be a test rather than a review habit because **ngx-translate does not fail on a
 * missing key** — `MissingTranslationHandler` renders the key itself, so `healthConnect.roster.today`
 * appears verbatim in the middle of a screen with nothing thrown and nothing logged. The English
 * build looks perfect, and the only way to notice is to switch language and look at every screen.
 *
 * <p>Unlike `mobile/`, whose catalogues are bundled TypeScript, `web/` ships **one JSON file per
 * group per locale**, merged into `i18n/<lang>.json` at build time by `MergeJsonWebpackPlugin`
 * (`webpack/webpack.custom.js`). So there are two ways for these to drift and both are checked: a
 * key missing from one locale's file, and a whole *file* missing from one locale — the second is
 * invisible to a merged-object comparison alone, because the plugin simply merges one file fewer.
 *
 * <p>Failures name the offending keys and locales rather than printing two long sorted lists to
 * diff by eye; a bare `toEqual` between 900-key objects is unreadable and gets skimmed.
 *
 * @see docs/CLAUDE.md § Cross-repo invariants, "Four languages, everywhere, always"
 */

const I18N_ROOT = resolve(__dirname, '../../../i18n');

/** The locales this app ships. Read from the app's own constant so the two cannot disagree. */
const LOCALES = LANGUAGES.filter(language => !language.startsWith('jhipster-needle'));

type Catalogue = Record<string, unknown>;

function filesIn(locale: string): string[] {
  return readdirSync(join(I18N_ROOT, locale))
    .filter(name => name.endsWith('.json'))
    .sort();
}

function read(locale: string, file: string): Catalogue {
  return JSON.parse(readFileSync(join(I18N_ROOT, locale, file), 'utf8')) as Catalogue;
}

/** Every leaf path in a nested catalogue, dot-joined: `global.menu.account.login`. */
function flatten(value: unknown, prefix = ''): string[] {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return Object.entries(value as Catalogue).flatMap(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key));
  }
  return [prefix];
}

/** Every leaf path *and its value*, so a check can look at what a key actually says. */
function entries(value: unknown, prefix = ''): [string, unknown][] {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return Object.entries(value as Catalogue).flatMap(([key, child]) => entries(child, prefix ? `${prefix}.${key}` : key));
  }
  return [[prefix, value]];
}

/**
 * The whole locale as one object, the way the merge plugin assembles it for the browser.
 *
 * <p>**Deep**, not a spread, because two files legitimately contribute to the same top-level group:
 * `global.json` defines `error.server.not.reachable`, `error.NotNull` and friends while `error.json`
 * defines `error.title` and `error.http.*`. A shallow spread would let one `error` group replace the
 * other outright, and this spec would then compare a key set the browser never sees — hiding drift
 * in whichever file lost, which is the opposite of the job.
 */
function deepMerge(base: Catalogue, extra: Catalogue): Catalogue {
  const out: Catalogue = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    const existing = out[key];
    const bothObjects =
      typeof existing === 'object' && existing !== null && !Array.isArray(existing) && typeof value === 'object' && value !== null;
    out[key] = bothObjects ? deepMerge(existing as Catalogue, value as Catalogue) : value;
  }
  return out;
}

function merged(locale: string): Catalogue {
  return filesIn(locale).reduce<Catalogue>((all, file) => deepMerge(all, read(locale, file)), {});
}

function keysOf(locale: string): string[] {
  return flatten(merged(locale)).sort();
}

describe('translation catalogues', () => {
  it('ships exactly the four languages the workspace requires', () => {
    // en/es/fr/de is a shipping condition, not a roadmap item. Spanish arrived with the careers
    // handoff; dropping any of the four is a product decision, not a refactor.
    expect(LOCALES).toEqual(['en', 'es', 'fr', 'de']);
  });

  it('finds catalogues to check, so a moved i18n directory cannot pass this suite silently', () => {
    // Without this, a wrong I18N_ROOT makes every comparison below compare two empty sets and pass.
    expect(filesIn('en').length).toBeGreaterThanOrEqual(10);
  });

  it.each(LOCALES.filter(locale => locale !== 'en'))('%s ships the same catalogue files English does', locale => {
    const english = filesIn('en');
    const other = filesIn(locale);

    expect({ locale, missing: english.filter(file => !other.includes(file)) }).toEqual({ locale, missing: [] });
    expect({ locale, unexpected: other.filter(file => !english.includes(file)) }).toEqual({ locale, unexpected: [] });
  });

  it.each(LOCALES.filter(locale => locale !== 'en'))('%s has exactly the keys English has — no missing, no extra', locale => {
    const english = keysOf('en');
    const other = keysOf(locale);

    expect({ locale, missing: english.filter(key => !other.includes(key)) }).toEqual({ locale, missing: [] });
    expect({ locale, extra: other.filter(key => !english.includes(key)) }).toEqual({ locale, extra: [] });
  });

  it.each(LOCALES.flatMap(locale => filesIn('en').map(file => [locale, file] as const)).filter(([locale]) => locale !== 'en'))(
    '%s/%s has exactly the keys the English file has',
    (locale, file) => {
      // Per-file as well as overall, because the merge is a shallow spread of top-level groups: a
      // key moved from `global.json` to `settings.json` in one locale only still merges to the same
      // set overall, and then one group silently overwrites the other depending on file order.
      const english = flatten(read('en', file)).sort();
      const other = flatten(read(locale, file)).sort();

      expect({ locale, file, missing: english.filter(key => !other.includes(key)) }).toEqual({ locale, file, missing: [] });
      expect({ locale, file, extra: other.filter(key => !english.includes(key)) }).toEqual({ locale, file, extra: [] });
    },
  );

  it.each(LOCALES)('%s has no blank values', locale => {
    // A blank string renders as nothing at all, which is worse than an untranslated key: the button
    // is still there and simply has no label, so it reads as a styling bug rather than a missing
    // translation and gets triaged to the wrong person.
    const blank = entries(merged(locale))
      .filter(([, value]) => typeof value !== 'string' || value.trim().length === 0)
      .map(([key]) => key);

    expect({ locale, blank }).toEqual({ locale, blank: [] });
  });

  it.each(LOCALES)('%s parses as JSON with no duplicate keys', locale => {
    // `JSON.parse` keeps the last of two identical keys, so by the time any check above runs the
    // duplicate is gone and every one of them sees a perfectly consistent object. Read the source
    // text instead. The visible symptom is a string that reverts for no reason when someone edits
    // what looks like the only definition of it.
    const duplicates: string[] = [];
    for (const file of filesIn(locale)) {
      const source = readFileSync(join(I18N_ROOT, locale, file), 'utf8');
      const seen = new Map<number, Set<string>>();
      let depth = 0;
      for (const line of source.split('\n')) {
        const key = /^\s*"([^"]+)"\s*:/.exec(line);
        if (key) {
          const bucket = seen.get(depth) ?? new Set<string>();
          if (bucket.has(key[1])) {
            duplicates.push(`${file}: ${key[1]}`);
          }
          bucket.add(key[1]);
          seen.set(depth, bucket);
        }
        // Depth is tracked by brace balance on the line, which is enough for the formatting
        // Prettier enforces here (one key per line, one brace per line).
        const opened = (line.match(/\{/g) ?? []).length;
        const closed = (line.match(/\}/g) ?? []).length;
        if (opened > closed) {
          depth += opened - closed;
        } else if (closed > opened) {
          for (let i = 0; i < closed - opened; i++) {
            seen.delete(depth);
            depth--;
          }
        }
      }
    }

    expect({ locale, duplicates }).toEqual({ locale, duplicates: [] });
  });
});
