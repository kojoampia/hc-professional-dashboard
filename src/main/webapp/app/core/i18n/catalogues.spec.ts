import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

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
 * <p>The merge itself is modelled here, in {@link deepMerge}, and a model of someone else's code is
 * a claim that goes stale quietly. So it is checked against the real thing: when a build output is
 * present and no older than the catalogues, `%s built catalogue matches the merge model` compares
 * every key **and value** of `target/classes/static/i18n/<lang>.json` with what this file computes.
 * With no build output it skips — visibly, with the reason in the test name, because a check that
 * silently passes when it did not run is worse than no check.
 *
 * @see docs/CLAUDE.md § Cross-repo invariants, "Four languages, everywhere, always"
 */

const I18N_ROOT = resolve(__dirname, '../../../i18n');

/** Where `ng build` writes the merged catalogues (`angular.json` → `outputPath`). */
const BUILT_I18N = resolve(__dirname, '../../../../../..', 'target/classes/static/i18n');

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
 *
 * <p>It models `MergeJsonWebpackPlugin.mergeDeep` (`node_modules/merge-jsons-webpack-plugin/index.js`)
 * rather than what a deep merge "should" do, in all three of its branches:
 *
 * <ol>
 *   <li>the target has nothing (or something falsy) at the key — the source's value is taken;
 *   <li>the source's value is an object — the plugin calls `mergeDeep(target[key], source[key])`
 *       and <strong>throws the return value away</strong>. When the target holds a *string* there,
 *       the recursive call finds a non-object target, does nothing, and the string survives while
 *       the whole source group is silently dropped. A model that let the group win would compare a
 *       key set the browser never receives — the exact failure this spec exists to prevent;
 *   <li>the source's value is a scalar — it wins, even over a whole group in the target.
 * </ol>
 *
 * <p>The last two are the only ways one file can overwrite another, they are asymmetric, and file
 * order decides which side is "target" (glob order, i.e. alphabetical). The
 * `%s built catalogue …` case below is what proves this model still matches the plugin.
 */
function deepMerge(base: Catalogue, extra: Catalogue): Catalogue {
  const out: Catalogue = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    const existing = out[key];
    // The plugin's `typeof x == "object"` — arrays and null included, exactly as it is written.
    const sourceIsObject = typeof value === 'object';
    const targetIsObject = typeof existing === 'object' && existing !== null;

    if (!existing) {
      out[key] = value;
    } else if (sourceIsObject) {
      out[key] = targetIsObject ? deepMerge(existing as Catalogue, value as Catalogue) : existing;
    } else {
      out[key] = value;
    }
  }
  return out;
}

function merged(locale: string): Catalogue {
  return filesIn(locale).reduce<Catalogue>((all, file) => deepMerge(all, read(locale, file)), {});
}

function keysOf(locale: string): string[] {
  return flatten(merged(locale)).sort();
}

/**
 * Whether the built catalogues can be compared against {@link merged}, and why not when they cannot.
 *
 * <p>`target/` is a build artefact and is gitignored, so a clean checkout has nothing to compare
 * with, and a stale `target/` would fail on catalogue edits that are simply newer than the last
 * build. Both are skips rather than failures — but **visible** ones: the reason is in the test name,
 * so a run where this never executed cannot be mistaken for a run where it passed.
 */
function builtCatalogueState(): { comparable: boolean; why: string } {
  const missing = LOCALES.filter(locale => !existsSync(join(BUILT_I18N, `${locale}.json`)));
  if (missing.length > 0) {
    return { comparable: false, why: `no build output at ${relative(process.cwd(), BUILT_I18N)}; run npx ng build` };
  }

  const newestSource = Math.max(...LOCALES.flatMap(locale => filesIn(locale).map(file => statSync(join(I18N_ROOT, locale, file)).mtimeMs)));
  const oldestBuilt = Math.min(...LOCALES.map(locale => statSync(join(BUILT_I18N, `${locale}.json`)).mtimeMs));

  return oldestBuilt >= newestSource
    ? { comparable: true, why: 'against the last build' }
    : { comparable: false, why: 'build output is older than the catalogues; run npx ng build' };
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
      // Per-file as well as overall, for two reasons. The first is file organisation: a key moved
      // from `global.json` to `settings.json` in one locale only merges to the same set overall, so
      // the check above sees nothing, and the next person editing the French `global.json` finds no
      // key to edit. The second is the one real overwrite case — a leaf in one file against a group
      // of the same name in another — which the merge resolves by file order and by which side is
      // the string (see `deepMerge`); comparing per file is what localises that to a file pair.
      const english = flatten(read('en', file)).sort();
      const other = flatten(read(locale, file)).sort();

      expect({ locale, file, missing: english.filter(key => !other.includes(key)) }).toEqual({ locale, file, missing: [] });
      expect({ locale, file, extra: other.filter(key => !english.includes(key)) }).toEqual({ locale, file, extra: [] });
    },
  );

  it.each(LOCALES)('%s defines every key once, whether written flat or nested', locale => {
    // ngx-translate's `getValue` resolves `"a.b": "…"` and `"a": { "b": "…" }` to the same path, and
    // both forms are used here on purpose — `error.server.not.reachable` is a flat key inside
    // `global.json`. What is not fine is *both* forms existing for one path: whichever the merge
    // resolves last wins, the other is a dead definition, and every check in this file is happy
    // because the path it compares exists either way.
    const keys = keysOf(locale);
    const duplicated = [...new Set(keys.filter((key, index) => keys.indexOf(key) !== index))];

    expect({ locale, duplicated }).toEqual({ locale, duplicated: [] });
  });

  const built = builtCatalogueState();
  if (!built.comparable) {
    // Belt and braces with the test name: a reporter that hides skipped cases still prints this.
    console.warn(`translation catalogues: built-catalogue verification SKIPPED — ${built.why}`);
  }

  (built.comparable ? it : it.skip).each(LOCALES)(`%s built catalogue matches the merge model — ${built.why}`, locale => {
    // The model in `deepMerge` is a *claim about someone else's code*, and an untested claim about
    // a dependency ages badly: the plugin resolves a leaf against a group in a way no reasonable
    // person would guess (see its docblock), and if it ever changed, every parity check above would
    // go on validating a merged object the browser never receives.
    const output = JSON.parse(readFileSync(join(BUILT_I18N, `${locale}.json`), 'utf8')) as Catalogue;
    const model = merged(locale);

    const builtKeys = flatten(output).sort();
    const modelKeys = flatten(model).sort();
    expect({ locale, missing: modelKeys.filter(key => !builtKeys.includes(key)) }).toEqual({ locale, missing: [] });
    expect({ locale, extra: builtKeys.filter(key => !modelKeys.includes(key)) }).toEqual({ locale, extra: [] });

    // Values too, not just keys: a leaf-versus-group collision resolved the other way shows up here
    // as a differing value long before it shows up as a differing key set.
    const shipped = new Map(entries(output));
    const differing = entries(model)
      .filter(([key, value]) => shipped.get(key) !== value)
      .map(([key]) => key);
    expect({ locale, differing }).toEqual({ locale, differing: [] });
  });

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
