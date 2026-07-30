#!/usr/bin/env node
/**
 * Restyles generated entity templates to the BridgeCare design system.
 *
 * JHipster emits Bootstrap markup, but Bootstrap was removed from this repo
 * (professional-web.md § "What was finished"). Those classes therefore resolve
 * to nothing — the screens render unstyled rather than merely off-brand.
 *
 * The target idiom is taken from the med-case module as restyled in the
 * BridgeCare migration, so generated CRUD matches the hand-built screens.
 *
 *   node scripts/restyle-generated-entities.mjs
 *
 * Idempotent. Run after postprocess-generated-entities.mjs.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src/main/webapp/app/entities';

const walk = dir =>
  readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : [];
  });

/** Bootstrap class -> BridgeCare / Tailwind equivalent. Order matters. */
const CLASS_MAP = [
  // Buttons. The repo's shared classes carry colour and shape.
  [/\bbtn btn-primary\b/g, 'hpd-btn hpd-btn-primary'],
  [/\bbtn btn-success\b/g, 'hpd-btn hpd-btn-primary'],
  [/\bbtn btn-danger\b/g, 'hpd-btn hpd-btn-danger'],
  [/\bbtn btn-secondary\b/g, 'hpd-btn hpd-btn-ghost'],
  [/\bbtn btn-info\b/g, 'hpd-btn hpd-btn-ghost'],
  [/\bbtn btn-outline-\w+\b/g, 'hpd-btn hpd-btn-ghost'],
  [/\bbtn-group\b/g, 'flex flex-wrap items-center gap-2'],

  // Forms.
  [/\bform-control\b/g, 'hpd-input'],
  [/\bform-label\b/g, 'hpd-label'],
  [/\bform-text\b/g, 'text-sm text-hpd-muted'],
  [/\bform-check-label\b/g, 'text-sm text-hpd-muted'],
  [/\bform-check-input\b/g, 'accent-hpd-primary'],
  [/\bform-check\b/g, 'flex items-center gap-2'],

  // Tables.
  [/\btable table-striped\b/g, 'w-full text-left text-sm'],
  [/\btable-responsive\b/g, 'overflow-x-auto rounded-hpd-sm border border-hpd-border'],

  // Alerts.
  [/\balert alert-warning\b/g, 'rounded-hpd-sm border border-[#eedfb9] bg-hpd-gold-tint px-4 py-3 text-sm text-hpd-muted'],
  [/\balert alert-danger\b/g, 'rounded-hpd-sm border border-hpd-danger bg-hpd-danger-tint px-4 py-3 text-sm text-hpd-danger'],
  [/\balert alert-info\b/g, 'rounded-hpd-sm border border-hpd-border bg-hpd-cream px-4 py-3 text-sm text-hpd-muted'],

  // Layout. Bootstrap's grid is gone; these are the Tailwind equivalents.
  [/\bd-flex justify-content-center\b/g, 'flex justify-center'],
  [/\bd-flex justify-content-between\b/g, 'flex items-center justify-between'],
  [/\bd-flex justify-content-end\b/g, 'flex justify-end'],
  [/\bd-flex\b/g, 'flex'],
  [/\bjustify-content-center\b/g, 'justify-center'],
  [/\bjustify-content-between\b/g, 'justify-between'],
  [/\bjustify-content-end\b/g, 'justify-end'],
  [/\balign-items-center\b/g, 'items-center'],
  [/\btext-end\b/g, 'text-right'],
  [/\btext-center\b/g, 'text-center'],
  [/\bfloat-end\b/g, 'ml-auto'],
  [/\bcol-md-\d+\b/g, ''],
  [/\bcol-\d+\b/g, ''],
  [/\brow\b(?=[^"]*")/g, 'grid gap-4'],
];

/** Page-level wrappers, applied to the outermost element of each screen. */
const SHELL = [
  // list pages
  [/<div class="jh-card">/g, '<div class="mx-auto max-w-7xl px-4 py-8 md:px-8">'],
  // headings
  [/<h2([^>]*)class="([^"]*)"/g, '<h2$1class="$2 mb-6 text-lg font-bold text-hpd-primary-dark"'],
];

let changed = 0;
for (const file of walk(ROOT)) {
  const src = readFileSync(file, 'utf8');
  let out = src;
  for (const [re, to] of CLASS_MAP) out = out.replace(re, to);
  for (const [re, to] of SHELL) out = out.replace(re, to);
  // Collapse whitespace the removals leave behind inside class attributes.
  out = out.replace(/class="([^"]*)"/g, (m, cls) => `class="${cls.replace(/\s+/g, ' ').trim()}"`);
  if (out !== src) {
    writeFileSync(file, out);
    changed++;
  }
}
console.log(`restyle: rewrote ${changed} generated templates`);
