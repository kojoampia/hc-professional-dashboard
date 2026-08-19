#!/usr/bin/env node
// Checks that run against the BUILT output, not the source.
//
//   node scripts/check-build-output.mjs [dist-dir]
//
// Every one of these guards a failure that compiles, tests green, and is invisible to `tsc` — which
// is the only kind worth spending a CI step on. Run after `npm run webapp:prod`.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] ?? 'target/classes/static';
let failed = false;

const fail = (msg) => {
  console.error(`  ✗ ${msg}`);
  failed = true;
};
const pass = (msg) => console.log(`  ✓ ${msg}`);

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
const styles = readdirSync(dist).filter((f) => /^styles\..*\.css$/.test(f));
if (styles.length !== 1) {
  fail(`expected exactly one styles.*.css in ${dist}, found ${styles.length}`);
} else {
  const css = readFileSync(join(dist, styles[0]), 'utf8');
  const missing = ['mx-auto', 'rounded-hpd', 'text-hpd-muted', 'grid-cols-3'].filter((u) => !css.includes(u));
  if (missing.length) {
    fail(`Tailwind produced no utilities for: ${missing.join(', ')} — the webpack.custom.js hook is inert, see professional-web.md`);
  } else {
    pass(`Tailwind utilities present in ${styles[0]} (${Math.round(css.length / 1024)} kB)`);
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

process.exit(failed ? 1 : 0);
