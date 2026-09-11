#!/usr/bin/env node
// Do the four translation catalogues hold the same keys?
//
//   node scripts/check-i18n-parity.mjs            # fail on any drift not already recorded
//   node scripts/check-i18n-parity.mjs --update   # re-record the baseline after fixing some
//
// Four languages — en, es, fr, de — are a standing condition of this platform, not a preference.
// ngx-translate renders a missing key as the key itself: a screen binding `metrics.jvm.memory`
// displays "metrics.jvm.memory" mid-page, throws nothing, logs nothing, and looks perfect in
// English. There is no runtime signal at all, which is why this has to be a build-time one.
//
// mobile/ has had this gate since MOB11. This repository has never had it, and CLAUDE.md says so:
// "web/ still has no gate of any of the three kinds and relies on the four i18n/ directories
// staying in step by hand."
//
// WHY A BASELINE RATHER THAN A CLEAN FAIL. Adding this found 56 keys already missing. Translating
// them is work for someone who speaks the languages, and blocking every pull request until that
// happens would get the check deleted rather than the keys translated. So the existing drift was
// recorded in i18n-drift-baseline.json and any NEW drift fails. The debt is visible, it cannot
// grow, and shrinking it is a normal change: fix some keys, run --update, commit a smaller file.
//
// THE BASELINE FILE IS GONE, AND ITS ABSENCE IS THE STRICTEST SETTING, NOT A MISSING ALLOWANCE
// (backlog item 26). The debt reached zero: the last 20 recorded keys were translated by item 3's
// 02d034d and nobody re-ran --update, so the file spent a week describing a state that had stopped
// existing. With no file, `baseline` below is {} and every drifted key is new drift — which is what
// we want. --update recreates it if a future change ever genuinely needs to record debt again.
//
// Note, before reaching for it, that recording debt here no longer buys a green build. The
// paragraph above used to say this repository had no other i18n gate; that stopped being true on
// 2026-09-02 when item 3 added app/core/i18n/catalogues.spec.ts, which asserts the same key parity
// with NO baseline mechanism, per locale and per file. CI runs `npm test` before this script in the
// same job, so drift fails there first and this script's allowance is never reached. Treat that
// spec as the gate of record and this script as the fast standalone check — it needs no Jest and no
// node_modules, which is why it is still here.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const I18N = 'src/main/webapp/i18n';
const BASELINE = 'i18n-drift-baseline.json';
const REFERENCE = 'en';
const LANGUAGES = ['en', 'es', 'fr', 'de'];
const update = process.argv.includes('--update');

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v !== null && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

const keysFor = (lang) => {
  const dir = join(I18N, lang);
  if (!existsSync(dir)) {
    console.error(`✗ ${I18N}/${lang} does not exist — four languages is a shipping condition`);
    process.exit(1);
  }
  const set = new Set();
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    for (const key of flatten(JSON.parse(readFileSync(join(dir, file), 'utf8')))) {
      set.add(`${basename(file)}:${key}`);
    }
  }
  return set;
};

const reference = keysFor(REFERENCE);
const drift = {};
for (const lang of LANGUAGES.filter((l) => l !== REFERENCE)) {
  const theirs = keysFor(lang);
  const missing = [...reference].filter((k) => !theirs.has(k)).sort();
  const extra = [...theirs].filter((k) => !reference.has(k)).sort();
  if (missing.length || extra.length) drift[lang] = { missing, extra };
}

if (update) {
  writeFileSync(BASELINE, `${JSON.stringify(drift, null, 2)}\n`);
  const total = Object.values(drift).reduce((n, d) => n + d.missing.length + d.extra.length, 0);
  console.log(`recorded ${total} known drifted keys in ${BASELINE}`);
  process.exit(0);
}

const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};
let failed = false;

for (const [lang, { missing, extra }] of Object.entries(drift)) {
  const known = baseline[lang] ?? { missing: [], extra: [] };
  const newMissing = missing.filter((k) => !known.missing.includes(k));
  const newExtra = extra.filter((k) => !known.extra.includes(k));
  if (newMissing.length || newExtra.length) {
    failed = true;
    console.error(`✗ ${lang}: ${newMissing.length} newly missing, ${newExtra.length} newly extra`);
    for (const k of [...newMissing, ...newExtra].slice(0, 20)) console.error(`    ${k}`);
    console.error(`  A key added to ${REFERENCE} must be added to es, fr and de in the same change.`);
  }
}

// A key that has since been translated should leave the baseline, or the file slowly stops
// describing anything and the gate quietly weakens.
for (const [lang, known] of Object.entries(baseline)) {
  const current = drift[lang] ?? { missing: [], extra: [] };
  const fixed = (known.missing ?? []).filter((k) => !current.missing.includes(k));
  if (fixed.length) {
    console.log(`  ${lang}: ${fixed.length} recorded key(s) no longer drifted — run --update to shrink the baseline`);
  }
}

const outstanding = Object.values(drift).reduce((n, d) => n + d.missing.length + d.extra.length, 0);
if (!failed) console.log(`✓ no new i18n drift (${outstanding} key(s) still on the recorded baseline)`);
process.exit(failed ? 1 : 0);
