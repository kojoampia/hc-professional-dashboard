#!/usr/bin/env node
// Checks that run against the BUILT output, not the source.
//
//   node scripts/check-build-output.mjs [dist-dir]
//
// Every one of these guards a failure that compiles, tests green, and is invisible to `tsc` — which
// is the only kind worth spending a CI step on. Run after `npm run webapp:prod`.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const dist = process.argv[2] ?? 'target/classes/static';
let failed = false;

const fail = msg => {
  console.error(`  ✗ ${msg}`);
  failed = true;
};
const pass = msg => console.log(`  ✓ ${msg}`);

if (!existsSync(dist)) {
  console.error(`no build output at ${dist} — run \`npm run webapp:prod\` first`);
  process.exit(1);
}

// ---------------------------------------------------------------- Tailwind actually ran
//
// Tailwind v4 is hand-wired into webpack/webpack.custom.js. Removing or breaking that hook does not
// fail the build: it emits a stylesheet with the handwritten CSS and none of the generated
// utilities, so every layout class in every template silently does nothing. professional-web.md
// records this going unnoticed for six phases, which is why it is checked in the artefact rather
// than trusted to an exit code.
//
// The four below are chosen to span the sources: a stock Tailwind utility, two BridgeCare tokens
// from the theme layer, and a grid class — if the pipeline half-runs, they do not all survive.
const styles = readdirSync(dist).filter(f => /^styles\..*\.css$/.test(f));
let stylesCss = null;
if (styles.length !== 1) {
  fail(`expected exactly one styles.*.css in ${dist}, found ${styles.length}`);
} else {
  stylesCss = readFileSync(join(dist, styles[0]), 'utf8');
  const missing = ['mx-auto', 'rounded-hpd', 'text-hpd-muted', 'grid-cols-3'].filter(u => !stylesCss.includes(u));
  if (missing.length) {
    fail(`Tailwind produced no utilities for: ${missing.join(', ')} — the webpack.custom.js hook is inert, see professional-web.md`);
  } else {
    pass(`Tailwind utilities present in ${styles[0]} (${Math.round(stylesCss.length / 1024)} kB)`);
  }
}

// ---------------------------------------------------------------- the policy the edge enforces
//
// The quality stack's nginx sends `script-src 'self'` and production sends no CSP at all, so
// anything the policy forbids works in production and breaks only where a policy exists — which is
// how the app came to render completely unstyled on the quality stack while every automated check
// reported 200 and the right <title>. curl neither executes scripts nor enforces CSP.
//
// Angular's inlineCritical is the specific offender: it emits
//   <link rel="stylesheet" media="print" onload="this.media='all'">
// and when that handler is blocked the sheet stays media=print and never applies.
//
// Comments are stripped first. index.html carries a commented-out Google Analytics block, and a
// naive grep for <script> reports it as a live third-party script that is not there.
const html = readFileSync(join(dist, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const violations = [
  ['inline <script> blocks', /<script(?![^>]*\ssrc=)[^>]*>/g],
  ['inline event handlers (onload=, onclick=, …)', /\son[a-z]+="[^"]*"/g],
  ['scripts from another origin', /<script[^>]*\ssrc="https?:\/\//g],
  ['stylesheets or fonts from another origin', /<link[^>]*href="https?:\/\//g],
];
let cspClean = true;
for (const [label, pattern] of violations) {
  const hits = html.match(pattern) ?? [];
  if (hits.length) {
    cspClean = false;
    fail(`index.html has ${hits.length} ${label}: ${[...new Set(hits)].slice(0, 3).join(' ')}`);
  }
}
if (cspClean) {
  pass("index.html carries nothing `default-src 'self'` would block");
}

// ---------------------------------------------------------------- nothing unservable under content/
//
// `content/` is copied wholesale into the bundle by the asset entry in angular.json, and the Sass
// sources the application compiles from live inside it. Until docs/backlog.md item 145 that entry's
// `ignore` read `["fonts/**"]` — which is not `scss/**` — so all five stylesheets were copied, and
// professional.abofonsa.com served them: measured 2026-09-17, five anonymous 200s totalling 28,802
// bytes, including the Material M3 palette derivation and the reasoning written in its comments.
//
// EVERY ASSERTION HERE IS AGAINST THE OUTPUT, NEVER AGAINST THE `ignore` GLOB, AND THAT IS THE
// WHOLE POINT. The glob was the right SHAPE — hc-admin and hc-patient use the same one — and three
// readers looked at this instance of it, one of them while writing a table about which repos were
// fixed, and all three concluded it was the fix. A check written against the config would have
// agreed with all three. (Mechanism 3 below does open angular.json, but only to learn what the
// build compiles; it never reads `ignore`, so a wrong one cannot make it pass. See its comment.)
//
// IT LISTS THE DIRECTORY rather than looking for the five `.scss` it knows about. hc-admin's
// equivalent expected eight files and found nine: the ninth was a Vitest spec living beside the
// stylesheets it reads, published as TypeScript, invisible to any rule phrased about Sass. A guard
// that enumerates what it expects finds only what somebody already thought of.
//
// THREE MECHANISMS ON THREE DIFFERENT AXES. Read them together:
//
//   1. an ALLOWLIST OF EXTENSIONS, below. Fails closed: an extension nobody listed reddens CI.
//   2. a DENYLIST OF FILENAMES, below that. Fails open: a name nobody listed passes.
//   3. a CROSS-CHECK AGAINST THE COMPILATION INPUTS, derived rather than listed. Enumerates
//      nothing, so it has no closed/open direction to get wrong.
//
// The allowlist is the primary and the denylist does not weaken it, because THEY ARE NOT THE SAME
// AXIS. Saying `.scss` is unservable is a claim about a format; saying `*.spec.*` is source is a
// claim about a name, and the second catches files whose extension is perfectly servable. Adding a
// second extension denylist WOULD be the failure this file argues against — adding a name denylist
// beside an extension allowlist composes with it.
//
// BE PRECISE ABOUT WHAT THE ALLOWLIST BUYS: it fails closed PER EXTENSION, NOT PER FILE. It cannot
// catch a build input wearing a servable extension, and one is standing in this very repository —
// `content/css/tailwind.css` is a Tailwind v4 entry point (`@import 'tailwindcss/theme'`, which
// resolves to nothing over HTTP), compiled into the bundle through angular.json's `styles` exactly
// as the five `.scss` are, and it was ALSO copied out verbatim and certified green by an earlier
// version of this check. It is now ignored by path in angular.json; `content/css/loading.css`
// beside it is genuinely runtime and index.html links it.
//
// Mechanisms 2 and 3 both exist because of that miss, and mechanism 3 is the one that covers it:
// a name denylist would only have caught it by someone writing `tailwind.css` into a list, which is
// the enumeration this whole check refuses to do.
//
// THE ALLOWLIST HOLDS ONLY WHAT IS ACTUALLY UNDER content/ TODAY, and that is the rule for editing
// it: no speculative entries. Every unused entry is silent-pass surface for a class of file nobody
// is thinking about — a `.json` nobody listed is a config file, a `.txt` is notes. Font extensions
// were here and are deliberately gone: the font check below argues that copying `content/fonts/`
// would ship a second unhashed unreferenced set, so pre-authorising `woff2` here contradicted it
// and made the `fonts/**` ignore unguarded. Adding an entry back costs four characters and a loud
// red build, which is exactly the price the allowlist argument budgets for.
const SERVABLE_EXTENSIONS = new Set(['css', 'ico', 'js', 'png', 'svg']);

// Mechanism 2. Matched against the FILENAME, so it sees what the extension lens cannot.
//
// hc-admin's ninth file transposed here is worse than it was there: jest.conf.js matches
// `src/main/webapp/app/**/*.spec.ts` only, so a `boot.spec.js` beside `content/js/boot.js` would be
// published AND never run — two silences, where hc-admin's at least executed. `.map` is here
// because a source map is the source, and the production build only happens not to emit one.
const UNSERVABLE_NAMES = [/\.spec\./, /\.test\./, /\.map$/];

// Mechanism 3. A FILE THE BUILD COMPILES MUST NOT ALSO BE SHIPPED AS SOURCE — that is the whole
// invariant this check exists for, and it can be stated without knowing a single extension or name.
//
// It DERIVES the list from angular.json's own `styles` — today five entries: four `.scss` and
// tailwind.css. Being derived, it needs no maintenance and covers entry points nobody has added
// yet, because the generator of the list is the build configuration rather than a reader.
//
// IT COVERS FIVE OF THE SIX FILES THIS ITEM WAS ABOUT, NOT ALL SIX, and the gap is the argument for
// keeping all three mechanisms. `_theme-colors.scss` is a Sass PARTIAL, pulled in by
// material-theme.scss with `@use`, so it is compiled without ever appearing in `styles` and
// mechanism 3 cannot see it. Mechanism 1 catches it on its extension. Run the negative control and
// the two lists differ by exactly that file — which is what composition looks like when it works.
//
// READING angular.json HERE IS NOT THE THING THE BACKLOG ROW WARNS AGAINST, and the difference is
// the direction. The failure was reading the config to CONCLUDE the output was fine — three readers
// looked at a plausible `ignore` and stopped. This never reads `ignore` at all: it reads the config
// only to learn what gets compiled, then asserts against the OUTPUT that none of it was also
// copied. A wrong `ignore` cannot make it pass, which is exactly what a config check could not say.
const projectStyles = (() => {
  const configPath = new URL('../angular.json', import.meta.url);
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const projects = Object.values(config.projects ?? {});
  return projects.flatMap(project => project?.architect?.build?.options?.styles ?? []);
})();
const CONTENT_INPUT = 'src/main/webapp/content/';
const compiledFromContent = projectStyles
  .filter(entry => typeof entry === 'string' && entry.startsWith(CONTENT_INPUT))
  .map(entry => entry.slice(CONTENT_INPUT.length));

const contentDir = join(dist, 'content');
if (!existsSync(contentDir)) {
  // A check that reports nothing forbidden over a directory that is not there has not checked
  // anything. Going green by finding nothing is the recurring defect in this estate.
  fail(`no ${contentDir} in the build output — the content asset entry in angular.json did not run, so this check proved nothing`);
} else {
  const entries = readdirSync(contentDir, { recursive: true, withFileTypes: true });
  const names = [];
  for (const entry of entries) {
    if (entry.isFile()) {
      names.push(relative(contentDir, join(entry.parentPath, entry.name)));
    }
  }
  const wrongExtension = [];
  const wrongName = [];
  for (const name of names) {
    const ext = extname(name).slice(1).toLowerCase();
    const base = name.slice(name.lastIndexOf('/') + 1);
    if (!SERVABLE_EXTENSIONS.has(ext)) {
      wrongExtension.push(name);
    } else if (UNSERVABLE_NAMES.some(pattern => pattern.test(base))) {
      wrongName.push(name);
    }
  }
  if (names.length === 0) {
    fail(`${contentDir} exists but is empty — the asset copy produced nothing, so this check proved nothing`);
  } else {
    if (wrongExtension.length) {
      fail(
        `${contentDir} holds ${wrongExtension.length} file(s) whose extension a browser is never meant to fetch: ` +
          `${wrongExtension.sort().join(', ')} — widen the \`ignore\` on the content asset entry in angular.json, or add the ` +
          `extension to SERVABLE_EXTENSIONS here if it really is an asset that is actually under content/`,
      );
    }
    if (wrongName.length) {
      fail(
        `${contentDir} holds ${wrongName.length} file(s) whose NAME says source rather than asset, whatever the extension says: ` +
          `${wrongName.sort().join(', ')} — widen the \`ignore\` on the content asset entry in angular.json`,
      );
    }
    // Mechanism 3, and its own vacuity guard first: if angular.json's shape ever changes under
    // this, the derivation silently yields [] and the check passes over everything. Going green by
    // finding nothing is the failure mode this estate keeps rediscovering, so refuse it here too.
    let compiledClean = true;
    if (compiledFromContent.length === 0) {
      compiledClean = false;
      fail(
        "derived no compilation inputs from angular.json's `styles` under " +
          `${CONTENT_INPUT} — the config shape changed, so mechanism 3 is checking nothing. Fix this derivation; do not let it pass by finding nothing`,
      );
    } else {
      const alsoCopied = compiledFromContent.filter(entry => names.includes(entry));
      if (alsoCopied.length) {
        compiledClean = false;
        fail(
          `${contentDir} holds ${alsoCopied.length} file(s) the build COMPILES and therefore must not also publish as source: ` +
            `${alsoCopied
              .sort()
              .join(', ')} — each is an entry in angular.json's \`styles\`; widen the \`ignore\` on the content asset entry`,
        );
      }
    }
    if (!wrongExtension.length && !wrongName.length && compiledClean) {
      pass(
        `${names.length} files under content/, none of them an unservable extension, a source filename, ` +
          `or one of the ${compiledFromContent.length} stylesheets the build compiles`,
      );
    }
  }
}

// ---------------------------------------------------------------- the fonts still resolve
//
// The `fonts/**` half of that `ignore` is NOT redundant and must stay. The three .woff2 under
// content/fonts/ do reach the output — through the stylesheet pipeline rather than the copy:
// fonts.scss is in angular.json's `styles`, so its url('../fonts/*.woff2') are resolved at build
// time and emitted at the output ROOT with content hashes, which is what styles.*.css references.
// Copying content/fonts/ as well would ship a second, unhashed, unreferenced set of the same bytes.
//
// So the three entries mean three different things: `scss/**` and `css/tailwind.css` stop something
// being published, `fonts/**` stops something being duplicated. THE IGNORE ITSELF IS GUARDED BY THE
// CHECK ABOVE, not here — font extensions are absent from SERVABLE_EXTENSIONS, so dropping
// `fonts/**` reddens naming the three .woff2 that appear under content/.
//
// What this second check asserts is the other half, and the one no ignore can give: every font the
// stylesheet names is actually in the artefact. The app self-hosts Inter and Material Icons and
// sends no request off-origin, so a url() resolving to nothing is a silent fallback to a system
// font on every page, which no build error and no 200 would report.
if (stylesCss === null) {
  // Unreachable while green: stylesCss is null only when the styles-count check above already
  // called fail(). Said out loud so a reader of a red run is not left wondering why it is missing.
  console.error('  · fonts not checked — no single styles.*.css to read them from');
} else {
  const fontUrls = [...new Set(stylesCss.match(/url\(([^)]*\.woff2?)\)/g) ?? [])];
  if (fontUrls.length === 0) {
    fail(
      `${styles[0]} references no self-hosted font at all — fonts.scss is in angular.json's \`styles\`, so this means the pipeline lost it`,
    );
  } else {
    const dangling = [];
    for (const raw of fontUrls) {
      const href = raw.slice(4, -1).replace(/^['"]|['"]$/g, '');
      if (!existsSync(join(dist, href))) {
        dangling.push(href);
      }
    }
    if (dangling.length) {
      fail(`${styles[0]} names ${dangling.length} font file(s) the build did not emit: ${dangling.join(', ')}`);
    } else {
      pass(`${fontUrls.length} self-hosted fonts referenced by ${styles[0]}, all present in ${dist}`);
    }
  }
}

process.exit(failed ? 1 : 0);
