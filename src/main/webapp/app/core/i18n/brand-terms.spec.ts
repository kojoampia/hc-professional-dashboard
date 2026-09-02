import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

/**
 * The product is **Abofonsa BridgeCare**, and nothing user-visible may say otherwise.
 *
 * <p>This is the cheap half of `../docs/backlog.md` item 3, and it is the half that would have
 * caught item 2. The footer read "Health Connect by Jojo Addison Information Systems Consultancy" on
 * every page, in production, right through the BridgeCare restyle and the brand-icon pass. Nothing
 * caught it because nothing looked — a rename is not a build error, and a stale brand renders
 * perfectly.
 *
 * <p>Three rules, in decreasing order of how obviously wrong the violation is:
 *
 * <ol>
 *   <li><strong>"Health Connect"</strong> — the pre-BridgeCare product name. It survives in
 *       identifiers (`healthConnect.*` catalogue keys, `HealthConnectRepository`, the
 *       `app/health-connect/` directory) and that is fine and deliberate; renaming the code is a
 *       different and much larger job. What is not fine is the spaced, capitalised form reaching a
 *       screen.
 *   <li><strong>"Jojo Addison Information Systems Consultancy"</strong> — the legacy company
 *       phrasing. The company is Jojo Addison Consultancy.
 *   <li><strong>"BridgeCare" without "Abofonsa"</strong> — the brand is never BridgeCare alone;
 *       dropping Abofonsa makes it read as an unrelated product. Where space genuinely forces a
 *       choice the short form is "Abofonsa", not "BridgeCare".
 * </ol>
 *
 * <p><strong>Comments are stripped before checking, deliberately.</strong> A comment explaining that
 * an asset "was logo.png — the old blue Health Connect mark" is exactly the historical note this
 * must not punish, and stripping is better than an allowlist because it cannot go stale. What is
 * checked is what ships: catalogue values, the rendered text of every template, and the TypeScript
 * source itself — a name assembled in code (`document.title = 'Health Connect Portal'`) reaches a
 * user just as surely as one written in markup, and is invisible to both of the other two rules.
 *
 * <p>Templates are checked with their **tags removed**, so the split wordmark in the sidebar —
 * `<span>Abofonsa</span>&nbsp;<span>BridgeCare</span>`, two colours, one name — reads as the whole
 * name it renders as rather than as a bare "BridgeCare".
 *
 * @see docs/CLAUDE.md § Cross-repo invariants
 */

const WEBAPP_ROOT = resolve(__dirname, '../../..');
const APP_ROOT = resolve(__dirname, '../..');
const I18N_ROOT = resolve(WEBAPP_ROOT, 'i18n');

/**
 * Genuine historical notes that name the old brand on purpose, outside a comment.
 *
 * Empty, and it should stay that way: a historical note belongs in a comment, which this spec
 * already ignores. An entry here means something ships the old name to a user and someone decided
 * that was correct — which needs the reason written down beside it.
 */
const ALLOWED: { file: string; term: string; why: string }[] = [];

const DENIED = [
  {
    term: 'Health Connect',
    pattern: /Health\s+Connect/g,
    instead: 'Abofonsa BridgeCare',
  },
  {
    term: 'Jojo Addison Information Systems Consultancy',
    pattern: /Jojo\s+Addison\s+Information\s+Systems\s+Consultancy/g,
    instead: 'Jojo Addison Consultancy',
  },
  {
    // "BridgeCare" is only ever correct with "Abofonsa" in front of it. The lookbehind allows the
    // possessive and hyphenated compounds the German and French copy needs
    // ("Abofonsa BridgeCare-Familienportal").
    term: 'BridgeCare without Abofonsa',
    pattern: /(?<!Abofonsa\s)BridgeCare/g,
    instead: 'Abofonsa BridgeCare',
  },
];

function walk(dir: string, extensions: string[]): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(full, extensions);
    }
    return extensions.some(extension => entry.name.endsWith(extension)) ? [full] : [];
  });
}

/**
 * The inline template of a component, or null. Balanced against `${}` like the literals spec.
 *
 * All three quote characters count: `template: '<hpd-main></hpd-main>'` is a real component here,
 * and matching the backtick alone left it out of the scan entirely.
 */
function inlineTemplate(source: string): string | null {
  const marker = /template:\s*(['"`])/.exec(source);
  if (!marker) {
    return null;
  }
  const quote = marker[1];
  const start = marker.index + marker[0].length;
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (char === '\\') {
      i++;
    } else if (quote === '`' && char === '$' && source[i + 1] === '{') {
      depth++;
      i++;
    } else if (quote === '`' && char === '}' && depth > 0) {
      depth--;
    } else if (char === quote && depth === 0) {
      return source.slice(start, i);
    }
  }
  return null;
}

function externalTemplate(source: string, file: string): string | null {
  const match = /templateUrl:\s*'([^']+)'/.exec(source);
  if (!match) {
    return null;
  }
  const path = resolve(dirname(file), match[1]);
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

/** What a template actually renders: no comments, no tags, entities and whitespace normalised. */
function renderedText(template: string): string {
  return template
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ');
}

function offences(text: string, file: string): string[] {
  return DENIED.flatMap(({ term, pattern, instead }) => {
    if (ALLOWED.some(entry => entry.file === file && entry.term === term)) {
      return [];
    }
    pattern.lastIndex = 0;
    return pattern.test(text) ? [`${file}: says "${term}" — use "${instead}"`] : [];
  });
}

function flatten(value: unknown, prefix = ''): [string, unknown][] {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key));
  }
  return [[prefix, value]];
}

describe('brand terms', () => {
  const locales = readdirSync(I18N_ROOT, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  it('finds the catalogues and the components, so a moved path cannot pass this silently', () => {
    expect(locales.sort()).toEqual(['de', 'en', 'es', 'fr']);
  });

  it.each(locales)('%s catalogue values carry no retired brand term', locale => {
    const found = walk(join(I18N_ROOT, locale), ['.json']).flatMap(file => {
      const catalogue = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
      // Keys are identifiers — `healthConnect.brand.name` is a path, not copy, and renaming the
      // namespace is a separate job. Only values reach a screen.
      return flatten(catalogue)
        .filter(([, value]) => typeof value === 'string')
        .flatMap(([key, value]) => offences(value as string, `${relative(WEBAPP_ROOT, file)} → ${key}`));
    });

    expect(found).toEqual([]);
  });

  it('no component template renders a retired brand term', () => {
    const found = walk(APP_ROOT, ['.ts'])
      .filter(file => !file.endsWith('.spec.ts'))
      .flatMap(file => {
        const source = readFileSync(file, 'utf8');
        const template = inlineTemplate(source) ?? externalTemplate(source, file);
        return template === null ? [] : offences(renderedText(template), relative(APP_ROOT, file));
      });

    expect(found).toEqual([]);
  });

  it('no component or service source carries a retired brand term', () => {
    // The template rule above sees rendered markup only, so `const fallbackTitle = 'Health Connect
    // Portal'` assigned to `document.title` passes it — and passes the untranslated-literals spec
    // too, whose prose test wants a lower-case second word. That is the shape of the defect this
    // whole gate was written for, so the TypeScript itself is scanned, comments stripped.
    //
    // Near-zero false-positive risk by construction: identifiers spell it `healthConnect` or
    // `health-connect`, and all three denied patterns require spacing and casing no identifier has.
    const found = walk(APP_ROOT, ['.ts'])
      .filter(file => !file.endsWith('.spec.ts'))
      .flatMap(file => {
        const source = readFileSync(file, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, ' ')
          .replace(/\/\/[^\n]*/g, ' ');
        return offences(source, relative(APP_ROOT, file));
      });

    expect(found).toEqual([]);
  });

  it('the shell documents carry the right name', () => {
    // `index.html` and `manifest.webapp` are the browser tab, the install prompt and the home-screen
    // label. They are outside every component, so the template rule above cannot see them.
    const shells = ['index.html', 'manifest.webapp', '404.html'].map(name => join(WEBAPP_ROOT, name));

    // Asserted rather than filtered: a renamed or moved shell document used to drop silently out of
    // coverage, which is the same failure mode as not checking it at all.
    expect(shells.filter(file => !existsSync(file)).map(file => relative(WEBAPP_ROOT, file))).toEqual([]);

    const found = shells.flatMap(file => offences(renderedText(readFileSync(file, 'utf8')), relative(WEBAPP_ROOT, file)));

    expect(found).toEqual([]);
  });

  it('allows only exceptions whose file still exists', () => {
    const missing = ALLOWED.filter(entry => !existsSync(join(WEBAPP_ROOT, entry.file.split(' → ')[0])));

    expect(missing).toEqual([]);
  });
});
