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
 * <p>It checks five things — the four `mobile/` needed, plus bound visible attributes:
 *
 * <ol>
 *   <li><strong>Text nodes</strong> — `>Sign in<`, outside any translated subtree.
 *   <li><strong>Visible attributes</strong> — `placeholder="Write a reply"`. Also catches a raw key
 *       used as a literal value (`aria-label="healthConnect.pagination.page"`), which a screen
 *       reader reads out verbatim.
 *   <li><strong>Bound visible attributes</strong> — `[attr.aria-label]="open ? 'Collapse' : 'Expand'"`.
 *       An expression, so it is judged the way interpolations are rather than the way literal
 *       attributes are.
 *   <li><strong>Interpolation expressions</strong> — `{{ mine ? 'You' : name }}`, and the same shape
 *       in an `@let`. Stripping `{{ … }}` wholesale as "already translated" is true of the common
 *       case and false of every ternary and every `??` fallback.
 *   <li><strong>TypeScript prose</strong> — `return 'No shift assigned'` in a component body, which
 *       no amount of template scanning can see.
 * </ol>
 *
 * <p><strong>What is scanned.</strong> Rules 1–4 need a template, so they run over every file that
 * has one, inline (backtick **or** quoted — `template: '<hpd-main></hpd-main>'` is a real component
 * in this repo) or by `templateUrl`. Rule 5 runs over **every** non-spec `.ts` file under `app/`,
 * services and models included: a component with no template of its own is still a component, and a
 * caption assembled in a service reaches a screen exactly like one assembled in a component. Two
 * things are deliberately outside that: `console.*` arguments, which reach a console no clinician
 * opens, and `health-connect/testing/`, which is test support imported by specs alone.
 *
 * <p><strong>What it cannot do.</strong> Rule 5 is a heuristic, not a parser: it looks for prose
 * *shape* — a capitalised word followed by further words — plus fallback literals after `||` and
 * `??`. A single capitalised word (`'Offline'`, `'GET'`, `'PENDING'`) is not flagged, because in
 * that position it is far more often an enum or a header than a caption. Strings assembled from
 * fragments at runtime are invisible to it.
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
  // Empty, and worth keeping empty. It held the eight JHipster `/admin/metrics` and `/admin/health`
  // blocks until backlog item 12 cleared them; the argument for exempting them was that JVM and
  // Actuator vocabulary is conventionally read in English, and it did not survive contact with the
  // catalogues — `i18n/*/metrics.json` already carried keys for most of those strings in all four
  // locales, so the templates were rendering English the repo had already paid to translate.
  //
  // What remained genuinely untranslatable turned out to be identifiers rather than copy, and the
  // markup now says so: `jvm.gc.pause` is a Micrometer meter name inside `<code>`, and a thread's
  // lock name is bound (`[title]`) rather than interpolated. Neither needed an exemption.
  //
  // Before adding a line here, check the two rules that make an exemption unnecessary: `<code>` and
  // the rest of NON_PROSE_ELEMENTS mute an element's content, and NOT_TRANSLATABLE covers a proper
  // noun that reads the same in every locale.
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
 * pure noise. `matTooltip` is here because Angular Material is the component library in this repo,
 * and it is cheapest to add while nothing violates it.
 *
 * Both forms are checked. The literal form (`title="Save"`) is judged as text; the bound form
 * (`[attr.aria-label]="open ? 'Collapse' : 'Expand'"`) is an expression and is judged with the same
 * heuristic as an interpolation, because it is the same shape and carries the same risk — a ternary
 * whose branches are English captions and whose pipe was forgotten.
 */
const VISIBLE_ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'aria-description', 'aria-placeholder', 'alt', 'label', 'matTooltip'];

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

/**
 * A wire value that happens to have the shape of prose.
 *
 * `Bearer ${token}` is an `Authorization` header, and it is two "words" only because the
 * interpolated credential counts as one. Deliberately exact — an HTTP authentication scheme
 * followed by nothing but an interpolation — so that "Basic information" is still reported.
 */
const WIRE_LITERAL = /^(?:Bearer|Basic|Digest|Token)\s+\$\{[^}]*\}$/;

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

/**
 * Every shipping `.ts` file under `app/`.
 *
 * `*.spec.ts` is excluded because a test is not a surface, and so is `testing/` for the same reason:
 * `health-connect/testing/` holds the fake repository and its fixtures, imported by specs and by
 * nothing else, and its two dozen invented patient names are test data rather than copy.
 */
function componentFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'testing' ? [] : componentFiles(full);
    }
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') ? [full] : [];
  });
}

/**
 * The inline template of a component, or null.
 *
 * <p>Walks to the closing quote rather than regex-matching, because a backtick template contains
 * `${}` interpolations of its own and a lazy match stops at the first one.
 *
 * <p>**All three quote characters count.** `template: '<hpd-main></hpd-main>'` is how `app.component.ts`
 * is written, and matching only the backtick form left that component with no template *and* no
 * `templateUrl`, so it dropped out of the suite entirely rather than being reported.
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

/**
 * Removes `@if (...) {`, `@for (...) {`, `@else {` and the rest, parentheses balanced.
 *
 * `@let` is the odd one out: it takes no parentheses and runs to a semicolon, so consuming only the
 * keyword would leave `greeting = 'Hello there'` behind as a text node. The whole statement goes,
 * and its expression is judged separately by {@link letLiterals} — dropping it silently would hide
 * exactly the literal this rule exists to find.
 */
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
    if (match[1] === 'let') {
      const end = template.indexOf(';', i);
      i = end === -1 ? template.length : end; // the loop's own i++ steps past the ';'
      continue;
    }
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
    offenders.push(...interpolationLiterals(raw), ...letLiterals(raw));

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

    // The bound forms — `[title]="…"`, `[attr.aria-label]="…"` — are expressions, so they are judged
    // the way an interpolation is rather than as text. Every one of these in the repo today carries
    // `| translate`; the next one that does not is the regression this rule exists to catch.
    const bound = new RegExp(`\\[(?:attr\\.)?${attribute}\\]\\s*=\\s*"([^"]*)"`, 'g');
    for (const [, expression] of attributes.matchAll(bound)) {
      offenders.push(
        ...expressionLiterals(expression).map(quoted => ({ rule: 'bound attribute', text: `[${attribute}]="… '${quoted}' …"` })),
      );
    }
  }
  return offenders;
}

/**
 * The displayed string literals of one Angular expression.
 *
 * <p>Shared by the three rules that judge an expression rather than text — interpolations, `@let`
 * declarations and bound visible attributes — because all three carry the same risk in the same
 * shape: a ternary whose branches are English captions and whose `| translate` was forgotten.
 *
 * <p>Looser than the TypeScript rule: a literal written inside a template expression is nearly
 * always displayed, so a single capitalised word counts. Server enums (`'VERIFIED'`) do not, having
 * no lower-case second letter. A literal piped through `translate`, or a catalogue key being built
 * up (`'x.y.' + status | translate`), is fine.
 */
function expressionLiterals(expression: string): string[] {
  if (/\|\s*translate/.test(expression)) {
    return [];
  }
  // Pipe arguments are formats, not prose: `| date: 'EEE d MMM'` must not be reported.
  const withoutPipeArgs = expression.replace(/\|\s*\w+\s*:\s*(['"])(?:(?!\1).)*\1/g, ' ');
  return [...withoutPipeArgs.matchAll(/(['"])((?:(?!\1).)*)\1/g)]
    .map(([, , quoted]) => quoted)
    .filter(quoted => !isTranslationKey(quoted) && /^[A-Z][a-z]/.test(quoted.trim()));
}

/**
 * String literals written inside `{{ … }}`.
 *
 * `{{ mine ? 'You' : name }}` is user-visible text that no amount of scanning text nodes will find,
 * because the whole interpolation is one expression.
 */
function interpolationLiterals(fragment: string): Offender[] {
  return [...fragment.matchAll(/\{\{([\s\S]*?)\}\}/g)].flatMap(([, expression]) =>
    expressionLiterals(expression).map(quoted => ({ rule: 'interpolation', text: `{{ … '${quoted}' … }}` })),
  );
}

/**
 * String literals declared with Angular 19's `@let`.
 *
 * `@let label = mine ? 'You' : name;` is displayed wherever the variable is used, and the statement
 * itself is stripped as syntax by {@link stripControlFlow}, so nothing else would ever look at it.
 */
function letLiterals(fragment: string): Offender[] {
  return [...fragment.matchAll(/@let\s+[\w$]+\s*=([^;]*);/g)].flatMap(([, expression]) =>
    expressionLiterals(expression).map(quoted => ({ rule: 'let', text: `@let … '${quoted}' …` })),
  );
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
  // The inline template is checked by the other rules; scanning it here would double-report. It is
  // subtracted from the *raw* source, before comments are stripped: a template containing any
  // `https://` URL loses its `//…` tail to the comment stripper first, after which `split(template)`
  // matches nothing and the entire template gets re-scanned as TypeScript.
  const body = stripConsoleCalls(
    (template === null ? source : source.split(template).join(' ')).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' '),
  );

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

/**
 * Removes the arguments of every `console.*` call.
 *
 * `console.error('User has not any of required authorities: ', authorities)` is prose by shape and
 * invisible by construction — it reaches the browser console, which no clinician opens. Balanced on
 * parentheses and aware of string literals, so a `)` inside a message cannot unbalance it.
 */
function stripConsoleCalls(source: string): string {
  let out = '';
  for (let i = 0; i < source.length; i++) {
    // `startsWith` first: slicing every character of every file to run a regex is needlessly slow.
    const call = source.startsWith('console.', i) ? /^console\.\w+\s*\(/.exec(source.slice(i, i + 40)) : null;
    if (!call) {
      out += source[i];
      continue;
    }
    i += call[0].length;
    let depth = 1;
    for (; i < source.length && depth > 0; i++) {
      const char = source[i];
      if (char === '\\') {
        i++;
      } else if (char === "'" || char === '"' || char === '`') {
        for (i++; i < source.length && source[i] !== char; i++) {
          if (source[i] === '\\') {
            i++;
          }
        }
      } else if (char === '(') {
        depth++;
      } else if (char === ')') {
        depth--;
      }
    }
    i--; // the loop's own i++ steps past the closing ')'
  }
  return out;
}

function isTranslationKey(literal: string): boolean {
  return /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)+$/.test(literal.trim());
}

/**
 * Does this literal read like something a person is meant to read?
 *
 * <p>A capitalised word followed by at least one more word: "No shift assigned". Not "Bearer " (no
 * second word), not "self-end max-w-[85%]" (lower-case start), not "today.onDuty" (a key), not
 * "GET".
 *
 * <p>Continuation words may be capitalised too, so that Title Case — "Add Document", "No Shifts
 * Today" — is reported. Requiring lower-case there let every button caption written in title case
 * through, which is a large share of the copy on a dashboard. The cost is a little more traffic
 * through the exemption list for capitalised multi-word technical strings; two words are still
 * required, so `'GET'`, `'PENDING'` and `'Offline'` remain unflagged.
 */
function isProse(literal: string): boolean {
  if (isTranslationKey(literal) || WIRE_LITERAL.test(literal.trim())) {
    return false;
  }
  return /^[A-Z][a-z]+([ ,]+[a-zA-Z$][\w${}]*)+/.test(literal.trim());
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
 * is a smaller hole than exempting the two files outright. `placeholder="e-mail"` is the concrete
 * one to know about: a real word, hyphenated, that this would exempt. Widening the rule to exclude
 * it would cost more than it saves — the tokens it recognises are the shape of an identifier the
 * server parses, and every extra condition here is another way for a caption to slip through.
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
    // Every file is scanned for TypeScript prose, template or no template, so this counts too.
    expect(files.length).toBeGreaterThanOrEqual(withTemplates.length);
    expect(files.length).toBeGreaterThanOrEqual(150);
  });

  it.each(files.map(file => [relative(APP_ROOT, file), file]))('%s', (name, file) => {
    if (EXEMPT_FILES[name as string]) {
      return;
    }
    const source = readFileSync(file as string, 'utf8');
    // A file with neither an inline template nor a `templateUrl` still gets its TypeScript scanned;
    // the template rules simply have nothing to look at.
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
