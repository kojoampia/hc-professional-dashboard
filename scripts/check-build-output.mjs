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
// THIS READS THE OUTPUT, NOT angular.json, AND THAT IS THE WHOLE POINT. The glob was the right
// SHAPE — hc-admin and hc-patient use the same one — and three readers looked at this instance of
// it, one of them while writing a table about which repos were fixed, and all three concluded it
// was the fix. A check written against the config would have agreed with all three.
//
// IT LISTS THE DIRECTORY AND ALLOWS EXTENSIONS, rather than looking for the five `.scss` it knows
// about. hc-admin's equivalent expected eight files and found nine: the ninth was a Vitest spec
// living beside the stylesheets it reads, published as TypeScript, invisible to any rule phrased
// about Sass. A guard that enumerates what it expects finds only what somebody already thought of,
// and the thing that ships is by definition the thing nobody thought of.
//
// ALLOWLIST, NOT DENYLIST, DELIBERATELY — the two fail in opposite directions and only one of them
// fails in a direction we can afford. An allowlist fails closed: adding a `.webp` next year reddens
// CI until someone adds four characters to the set below, which costs a minute and is loud. A
// denylist fails open: the extension nobody listed ships to the public internet and stays there
// until an unrelated sweep notices — which is the entire history of this defect, found in a sweep
// of a sibling product. The directory is served to anonymous callers, so pay the minute.
const SERVABLE_EXTENSIONS = new Set([
  // images
  'avif',
  'gif',
  'ico',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'webp',
  // fonts — not copied today, see the font check below; listed so that one day they may be
  'otf',
  'ttf',
  'woff',
  'woff2',
  // things a page loads directly
  'css',
  'js',
  'json',
  'mjs',
  'txt',
  'webmanifest',
]);

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
  const unservable = [];
  for (const name of names) {
    const ext = extname(name).slice(1).toLowerCase();
    if (!SERVABLE_EXTENSIONS.has(ext)) {
      unservable.push(name);
    }
  }
  if (names.length === 0) {
    fail(`${contentDir} exists but is empty — the asset copy produced nothing, so this check proved nothing`);
  } else if (unservable.length) {
    fail(
      `${contentDir} holds ${unservable.length} file(s) a browser is never meant to fetch: ${unservable.sort().join(', ')} — ` +
        `widen the \`ignore\` on the content asset entry in angular.json, or add the extension to SERVABLE_EXTENSIONS here if it really is an asset`,
    );
  } else {
    pass(`${names.length} files under content/, every one a servable asset`);
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
// So the pair means two different things: `scss/**` stops something being published, `fonts/**`
// stops something being duplicated. What this asserts is the consequence that matters — every font
// the stylesheet names is actually in the artefact. The app self-hosts Inter and Material Icons and
// sends no request off-origin, so a url() resolving to nothing is a silent fallback to a system
// font on every page, which no build error and no 200 would report.
if (stylesCss !== null) {
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
