import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

/**
 * Fails when a component surface shows text that is not driven by a translation.
 *
 * <p>`catalogues.spec.ts` proves the four catalogues hold the same keys. That is a different
 * question from this one, and passing it says nothing about whether the screens actually use those
 * keys — a string hardcoded in a template is perfectly consistent across four catalogues that never
 * mention it. Key parity was green in `mobile/` for the whole of MOB11 while nineteen hardcoded
 * English strings shipped, including every word on the sign-in screen.
 *
 * <p><strong>This does not grep for quoted strings, and must never be rewritten to.</strong> That is
 * precisely what missed those nineteen: text between tags (`>Sign in<`) and attribute values
 * (`placeholder="Write a reply"`) are invisible to a quoted-string sweep, and they are where
 * user-visible copy actually lives. The template is tokenised into tags and text nodes with a tag
 * stack instead, which is what makes the two rules below expressible at all.
 *
 * <p>Ported from `mobile/src/app/core/i18n/untranslated-literals.spec.ts` and adapted, because the
 * template conventions genuinely differ. `mobile/` is Ionic with `{{ … | translate }}` throughout;
 * this repo is JHipster/Angular and translates in two idioms — the `{{ 'key' | translate }}` pipe
 * **and** the `jhiTranslate` directive, which replaces an element's content at runtime and leaves
 * the English inside it as a build-time fallback. Flagging that fallback would report 269 false
 * positives and the spec would be deleted within a week, so the tag stack tracks it.
 *
 * <p>It checks four things, mirroring the four `mobile/` needed:
 *
 * <ol>
 *   <li><strong>Text nodes</strong> — `>Sign in<`, outside any translated subtree.
 *   <li><strong>Visible attributes</strong> — `placeholder="Write a reply"`. Also catches a raw key
 *       used as a literal value (`aria-label="healthConnect.pagination.page"`), which a screen
 *       reader reads out verbatim.
 *   <li><strong>Interpolation expressions</strong> — `{{ mine ? 'You' : name }}`. Stripping
 *       `{{ … }}` wholesale as "already translated" is true of the common case and false of every
 *       ternary and every `??` fallback.
 *   <li><strong>TypeScript prose</strong> — `return 'No shift assigned'` in a component body, which
 *       no amount of template scanning can see.
 * </ol>
 *
 * <p><strong>What it cannot do.</strong> Rule 4 is a heuristic, not a parser: it looks for prose
 * *shape* — a capitalised word followed by lower-case words — plus fallback literals after `||` and
 * `??`. A single capitalised word in TypeScript (`'Offline'`, `'GET'`, `'PENDING'`) is not flagged,
 * because in that position it is far more often an enum or a header than a caption. Strings
 * assembled from fragments at runtime are invisible to it, and services outside component files are
 * not scanned.
 *
 * @see docs/CLAUDE.md § Cross-repo invariants, "Four languages, everywhere, always"
 */

const APP_ROOT = resolve(__dirname, '../..');

/**
 * Surfaces that legitimately ship untranslated, with the reason.
 *
 * Keep this list short and justified, and prefer translating to adding a line here. Anything a
 * clinician or an applicant can reach in normal use belongs in the catalogues, not in this map.
 */
const EXEMPT_FILES: Record<string, string> = {
  // The JHipster-generated `/admin/metrics` and `/admin/health` blocks. These are ROLE_ADMIN-only
  // ops dashboards that render JVM internals — "GC Live Data Size", "Process files max",
  // "jvm.gc.pause", "Timed Waiting" — in the vocabulary the JVM itself publishes. That vocabulary is
  // conventionally left in English wherever it appears (Actuator, JConsole, Grafana), and a German
  // rendering of "GC Memory Promoted" would make the page harder to read for the one audience that
  // reads it. They are this repo's equivalent of `mobile/`'s exempted `diagnostics.page.ts`.
  //
  // Not permanent: `i18n/*/metrics.json` and `health.json` already carry keys for roughly two
  // thirds of these strings and the templates simply do not use them. Wiring the templates to the
  // keys they already have is worth doing on its own; it is not part of porting this gate.
  // Tracked as item 12 in `backlog.md`, which lists all eight and what each still hardcodes.
  'admin/health/modal/health-modal.component.ts': 'JHipster ops dashboard — JVM/Actuator vocabulary, admin-only. See note above.',
  'admin/metrics/blocks/jvm-memory/jvm-memory.component.ts': 'JHipster ops dashboard — JVM/Actuator vocabulary, admin-only.',
  'admin/metrics/blocks/jvm-threads/jvm-threads.component.ts': 'JHipster ops dashboard — JVM/Actuator vocabulary, admin-only.',
  'admin/metrics/blocks/metrics-datasource/metrics-datasource.component.ts':
    'JHipster ops dashboard — JVM/Actuator vocabulary, admin-only.',
  'admin/metrics/blocks/metrics-endpoints-requests/metrics-endpoints-requests.component.ts':
    'JHipster ops dashboard — JVM/Actuator vocabulary, admin-only.',
  'admin/metrics/blocks/metrics-garbagecollector/metrics-garbagecollector.component.ts':
    'JHipster ops dashboard — JVM/Actuator vocabulary, admin-only.',
  'admin/metrics/blocks/metrics-modal-threads/metrics-modal-threads.component.ts':
    'JHipster ops dashboard — JVM/Actuator vocabulary, admin-only.',
  'admin/metrics/blocks/metrics-system/metrics-system.component.ts': 'JHipster ops dashboard — JVM/Actuator vocabulary, admin-only.',
};

/**
 * Proper nouns and technical tokens, which read identically in every locale.
 *
 * "Abofonsa BridgeCare" is the product name and is deliberately never translated — the same rule
 * `mobile/` asserts. The rest are protocol and vendor names that appear on the JHipster admin
 * screens.
 */
const NOT_TRANSLATABLE = [
  'Abofonsa BridgeCare',
  'Abofonsa',
  'BridgeCare',
  'Jojo Addison Consultancy',
  'JHipster',
  'Spring Boot',
  'Angular',
  'MongoDB',
  'Kafka',
  'Consul',
  'OpenAPI',
  'Swagger',
];

/**
 * Attributes whose value is displayed or read aloud.
 *
 * `name`, `type`, `class`, `role`, `data-cy` and friends are not, and listing them would produce
 * pure noise. Only the *unbound* form is checked — `[title]="expr"` is an expression, and an
 * expression that needs translating goes through the pipe, which this cannot and need not judge.
 */
const VISIBLE_ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'alt', 'label'];

/**
 * Elements whose text content is not prose.
 *
 * `<mat-icon>close</mat-icon>` — the text is an icon ligature name, a token Material resolves to a
 * glyph. Translating it would render the word instead of the icon.
 */
const NON_PROSE_ELEMENTS = new Set(['mat-icon', 'script', 'style', 'svg', 'path', 'code', 'pre']);

/**
 * Attributes that make an element's content come from somewhere else at runtime.
 *
 * `jhiTranslate` is the JHipster directive and by far the common case here: it overwrites the
 * element's innerHTML with the catalogue value, so whatever is written between the tags is a
 * build-time fallback that no user ever sees.
 */
const CONTENT_REPLACING_ATTRIBUTES = ['jhiTranslate', '[jhiTranslate]', 'innerHTML', '[innerHTML]', 'translate', '[translate]'];

/** HTML elements that never have a closing tag, so they must not be pushed onto the tag stack. */
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

interface Offender {
  rule: string;
  text: string;
}

function componentFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return componentFiles(full);
    }
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') ? [full] : [];
  });
}

/**
 * The inline template of a component, or null.
 *
 * Walks to the closing backtick rather than regex-matching, because templates contain `${}`
 * interpolations of their own and a lazy match stops at the first one.
 */
function inlineTemplate(source: string): string | null {
  const marker = /template:\s*`/.exec(source);
  if (!marker) {
    return null;
  }
  const start = marker.index + marker[0].length;
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (char === '\\') {
      i++;
    } else if (char === '$' && source[i + 1] === '{') {
      depth++;
      i++;
    } else if (char === '}' && depth > 0) {
      depth--;
    } else if (char === '`' && depth === 0) {
      return source.slice(start, i);
    }
  }
  return null;
}

/** The `templateUrl` of a component resolved against its own directory, or null. */
function externalTemplate(source: string, file: string): string | null {
  const match = /templateUrl:\s*'([^']+)'/.exec(source);
  if (!match) {
    return null;
  }
  const path = resolve(dirname(file), match[1]);
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

function stripComments(template: string): string {
  return template.replace(/<!--[\s\S]*?-->/g, ' ');
}

/** Removes `@if (...) {`, `@for (...) {`, `@else {` and the rest, parentheses balanced. */
function stripControlFlow(template: string): string {
  let out = '';
  for (let i = 0; i < template.length; i++) {
    const rest = template.slice(i);
    const match = /^@(if|else if|else|for|empty|switch|case|default|defer|placeholder|loading|error|let)\b/.exec(rest);
    if (!match) {
      out += template[i];
      continue;
    }
    i += match[0].length;
    // Skip the condition, if this keyword takes one. Parens nest: @if (a() > b()).
    while (i < template.length && /\s/.test(template[i])) {
      i++;
    }
    if (template[i] === '(') {
      let depth = 0;
      for (; i < template.length; i++) {
        if (template[i] === '(') {
          depth++;
        } else if (template[i] === ')' && --depth === 0) {
          break;
        }
      }
    }
    i--; // the loop's own i++ steps past the ')'
  }
  return out;
}

const TAG = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^<>])*?)(\/?)>/g;

/**
 * Text nodes that a user actually sees, and the visible attributes on the tags around them.
 *
 * <p>This is the tokeniser the class comment insists on. It walks the template tag by tag keeping a
 * stack, so it knows whether the text it is looking at sits inside a `jhiTranslate` subtree (whose
 * content is replaced at runtime) or inside a `<mat-icon>` (whose content is a ligature). A regex
 * over `>([^<>]*)<` cannot answer either question, and both are the difference between a spec
 * people keep and a spec people delete.
 */
function scanTemplate(template: string): Offender[] {
  const source = stripComments(template);
  const offenders: Offender[] = [];
  const stack: { name: string; muted: boolean }[] = [];
  let muted = 0;
  let cursor = 0;

  const takeText = (raw: string): void => {
    if (muted > 0) {
      return;
    }
    // Interpolation literals are scanned here rather than over the whole template, so that they
    // obey the same tag stack. `<a jhiTranslate="global.ribbon.{{ env }}">{{ { dev: 'Development' }
    // [env] }}</a>` has its entire content replaced at runtime, so the literal inside it is a
    // build-time fallback exactly like the text beside it — scanning the raw template would report
    // it, and the only available fix would be to delete a deliberate fallback.
    offenders.push(...interpolationLiterals(raw));

    // Control flow and its braces are syntax, and interpolations are now accounted for.
    const text = stripControlFlow(raw.replace(/\{\{[\s\S]*?\}\}/g, ' '))
      .replace(/[{}]/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (isTranslatable(text)) {
      offenders.push({ rule: 'text', text });
    }
  };

  TAG.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG.exec(source)) !== null) {
    takeText(source.slice(cursor, match.index));
    cursor = TAG.lastIndex;

    const [, closing, rawName, attributes, selfClosing] = match;
    const name = rawName.toLowerCase();

    if (closing) {
      // Unwind to the matching open tag; unbalanced markup must not leave the stack muted forever.
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].name === name) {
          for (let j = stack.length - 1; j >= i; j--) {
            if (stack[j].muted) {
              muted--;
            }
          }
          stack.length = i;
          break;
        }
      }
      continue;
    }

    if (muted === 0) {
      offenders.push(...scanAttributes(attributes));
    }

    const replacesContent = CONTENT_REPLACING_ATTRIBUTES.some(attribute =>
      new RegExp(`(?<![\\w-])${attribute.replace(/[[\]]/g, '\\$&')}\\s*=`).test(attributes),
    );
    const isMuted = replacesContent || NON_PROSE_ELEMENTS.has(name);

    if (!selfClosing && !VOID_ELEMENTS.has(name)) {
      stack.push({ name, muted: isMuted });
      if (isMuted) {
        muted++;
      }
    }
  }
  takeText(source.slice(cursor));

  return offenders;
}

function scanAttributes(attributes: string): Offender[] {
  const offenders: Offender[] = [];
  for (const attribute of VISIBLE_ATTRIBUTES) {
    // Not [attr]="…" and not (attr)="…": those are expressions. `attr.title` is the bound form too.
    const pattern = new RegExp(`(?<![\\[(\\w.-])${attribute}\\s*=\\s*"([^"]*)"`, 'g');
    for (const [, value] of attributes.matchAll(pattern)) {
      if (value.includes('{{')) {
        // `placeholder="{{ 'global.form.email.placeholder' | translate }}"` — the JHipster idiom.
        if (!/\|\s*translate/.test(value)) {
          offenders.push({ rule: 'attribute', text: `${attribute}="${value}" (interpolated but not translated)` });
        }
        continue;
      }
      if (isTranslationKey(value)) {
        // A catalogue key used as a literal value. Nothing resolves it, so a screen reader reads
        // "health connect dot pagination dot page" aloud. Silent, and only findable by listening.
        offenders.push({ rule: 'attribute', text: `${attribute}="${value}" (raw catalogue key, never resolved)` });
        continue;
      }
      if (attribute === 'placeholder' && isFormatExample(value)) {
        continue;
      }
      if (isTranslatable(value)) {
        offenders.push({ rule: 'attribute', text: `${attribute}="${value}"` });
      }
    }
  }
  return offenders;
}

/**
 * String literals written inside `{{ … }}`.
 *
 * `{{ mine ? 'You' : name }}` is user-visible text that no amount of scanning text nodes will find,
 * because the whole interpolation is one expression. A literal that is piped through `translate`,
 * or that is a catalogue key being built up (`'x.y.' + status | translate`), is fine.
 */
function interpolationLiterals(fragment: string): Offender[] {
  const offenders: Offender[] = [];
  for (const [, expression] of fragment.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
    if (/\|\s*translate/.test(expression)) {
      continue;
    }
    // Pipe arguments are formats, not prose: `| date: 'EEE d MMM'` must not be reported.
    const withoutPipeArgs = expression.replace(/\|\s*\w+\s*:\s*(['"])(?:(?!\1).)*\1/g, ' ');
    for (const [, , quoted] of withoutPipeArgs.matchAll(/(['"])((?:(?!\1).)*)\1/g)) {
      // Looser than the TypeScript rule: a literal written inside an interpolation is nearly always
      // displayed, so a single capitalised word counts. Server enums (`'VERIFIED'`) do not, having
      // no lower-case second letter.
      if (!isTranslationKey(quoted) && /^[A-Z][a-z]/.test(quoted.trim())) {
        offenders.push({ rule: 'interpolation', text: `{{ … '${quoted}' … }}` });
      }
    }
  }
  return offenders;
}

/**
 * User-visible strings assembled in TypeScript rather than in the template.
 *
 * <p>This is the gap that shipped six untranslated strings on `mobile/`'s Today card while the
 * template scanner reported the file clean — they were in `computed()` bodies. Naming the
 * limitation was not enough there, and would not be here.
 *
 * <p>It cannot be exact. A parser cannot tell a caption from a log line, so this looks only for
 * **prose shape** in component files and accepts that a genuinely non-visible string of that shape
 * has to be reworded or exempted.
 */
function typescriptProse(source: string, template: string | null): Offender[] {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  // The inline template is checked by the other rules; scanning it here would double-report.
  const body = template === null ? withoutComments : withoutComments.split(template).join(' ');

  const offenders: Offender[] = [];
  for (const [, , quoted] of body.matchAll(/(['"`])((?:(?!\1)[\s\S])*)\1/g)) {
    if (isProse(quoted)) {
      offenders.push({ rule: 'typescript', text: quoted.replace(/\s+/g, ' ').slice(0, 60) });
    }
  }

  // Fallback values are the other shape this takes: `subject || 'Conversation'`. A single
  // capitalised word is too common in TypeScript to flag everywhere — icon names, HTTP verbs,
  // server enums — but as the right-hand side of `||` or `??` it is a default shown to someone.
  for (const [, , quoted] of body.matchAll(/(?:\|\||\?\?)\s*(['"`])([A-Z][a-z]+(?:[\s,][^'"`]*)?)\1/g)) {
    offenders.push({ rule: 'typescript', text: quoted.replace(/\s+/g, ' ').slice(0, 60) });
  }
  return offenders;
}

function isTranslationKey(literal: string): boolean {
  return /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)+$/.test(literal.trim());
}

/**
 * Does this literal read like something a person is meant to read?
 *
 * A capital followed by lower-case words: "No shift assigned". Not "Bearer " (no second word), not
 * "self-end max-w-[85%]" (lower-case start), not "today.onDuty" (a key), not "GET".
 */
function isProse(literal: string): boolean {
  if (isTranslationKey(literal)) {
    return false;
  }
  return /^[A-Z][a-z]+([ ,]+[a-z$][\w${}]*)+/.test(literal.trim());
}

/**
 * Is this placeholder an example of the *value to type* rather than a caption?
 *
 * <p>A placeholder is the one visible attribute that legitimately shows sample data:
 * `placeholder="ROLE_NURSE"` on the broadcast field and `placeholder="team-1, team-2"` on the team
 * list are both showing the shape of an identifier the server will parse. Translating either would
 * be actively wrong — the user would type the translation and the request would fail.
 *
 * <p>Deliberately narrow. Every token must carry a separator, so it recognises `UPPER_SNAKE_CASE`
 * and `kebab-case-1` and nothing else. A caption never takes either shape, so `Send`, `Write a
 * reply` and `Add a document` are all still reported. The known cost is that a lower-case
 * hyphenated English placeholder (`sign-in`) would be exempted; that has not occurred here, and it
 * is a smaller hole than exempting the two files outright.
 */
function isFormatExample(value: string): boolean {
  const tokens = value.split(/[\s,;/|]+/).filter(Boolean);
  return (
    tokens.length > 0 && tokens.every(token => /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/.test(token) || /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(token))
  );
}

/** Is there language left once proper nouns, punctuation, digits and separators are removed? */
function isTranslatable(text: string): boolean {
  const bare = NOT_TRANSLATABLE.reduce((acc, noun) => acc.split(noun).join(' '), text);
  return /[A-Za-z]{2}/.test(bare.replace(/[·•—–\-:,.()/|&+*#%@\d\s]+/g, ' ').trim());
}

describe('component surfaces contain no untranslated text', () => {
  const files = componentFiles(APP_ROOT);
  const withTemplates = files.filter(file => {
    const source = readFileSync(file, 'utf8');
    return inlineTemplate(source) !== null || externalTemplate(source, file) !== null;
  });

  it('finds components to check, so a broken path cannot pass this suite silently', () => {
    // Without this, a wrong APP_ROOT makes every case below a no-op and the suite passes green.
    expect(withTemplates.length).toBeGreaterThanOrEqual(50);
  });

  it.each(withTemplates.map(file => [relative(APP_ROOT, file), file]))('%s', (name, file) => {
    if (EXEMPT_FILES[name as string]) {
      return;
    }
    const source = readFileSync(file as string, 'utf8');
    const template = inlineTemplate(source) ?? externalTemplate(source, file as string) ?? '';

    const offenders = [...scanTemplate(template), ...typescriptProse(source, inlineTemplate(source))].map(
      offender => `${offender.rule}: ${offender.text}`,
    );

    expect(offenders).toEqual([]);
  });

  it('exempts only surfaces that still exist', () => {
    // An exemption for a deleted file is dead weight that quietly widens to nothing; one for a
    // renamed file silently stops exempting and starts failing, which is at least loud.
    const missing = Object.keys(EXEMPT_FILES).filter(name => !files.some(file => relative(APP_ROOT, file) === name));

    expect(missing).toEqual([]);
  });
});
