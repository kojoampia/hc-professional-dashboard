# Phase 0 — Design tokens & Material M3 theme foundation

**Branch:** `phase-0` (off `main`)

## What changed

1. **`src/main/webapp/content/scss/global.scss`** — replaced every `--hpd-color-*` value under `:root` with the palette from `professional-demo.html` (indigo `#6366f1` primary, slate surfaces/text, rose/indigo/emerald row tints, amber/teal edit/copy highlights). Added a token-contract table as a comment directly above `:root` (old token → value → Tailwind class → where it's used) so later phases don't have to re-derive the mapping. Left the rest of the file (Bootstrap tweaks, entity-list/detail helper classes, `.hpd-shell`/`.hpd-container`/etc. structural rules) untouched — those are Phase 5/6/7 concerns.
2. **`src/main/webapp/content/css/tailwind.css`** — extended the `@theme` block with new Tailwind color tokens (`--color-hpd-muted`, `--color-hpd-primary-dark`, `--color-hpd-border`, `--color-hpd-row-urgent/open/closed`, `--color-hpd-edit`, `--color-hpd-copy`, `--color-hpd-close`), all mapped onto the `--hpd-color-*` custom properties from `global.scss` so Tailwind utility classes (`bg-hpd-row-urgent`, `text-hpd-muted`, etc.) are available for Phases 2–6 to use directly instead of hand-rolled CSS.
3. **`src/main/webapp/index.html`** — added the Material Icons Google Fonts `<link>` (preconnect + stylesheet), matching `professional-demo.html`. Required before any component can render `<span class="material-icons">`/`<mat-icon>` ligatures.
4. **`src/main/webapp/content/scss/material-theme.scss`** (new) — a real Angular Material 3 theme using the Material 19 `mat.theme()` system-token API (`color.primary: mat.$violet-palette`, `color.tertiary: mat.$blue-palette`, `typography: Inter`, `density: 0`), replacing the M2-style `azure-blue` prebuilt theme.
5. **`angular.json`** — removed `node_modules/@angular/material/prebuilt-themes/azure-blue.css` from the `styles` array, added `material-theme.scss` (loaded before `global.scss`/`tailwind.css` so component-level Tailwind utilities can still win on specificity).

## Known limitation, called out deliberately

`mat.$violet-palette` is the closest **bundled** M3 tonal palette to the design system's indigo `#6366f1` — Angular Material doesn't ship a palette literally named "indigo". Getting pixel-exact tonal values from that seed color requires running the Material Theme Builder and pasting its generated palette map in, which wasn't done here (out of scope for this phase, no visual regression risk since Material components aren't yet used in any restyled screen). Documented in `material-theme.scss` itself.

## Verification

- `npx ng build --configuration development` — succeeds (`✔ Browser application bundle generation complete`, twice — main bundle + i18n extraction pass). Only pre-existing warnings (Sass `@import`/`mix()` deprecation notices from Bootstrap, three pre-existing unused-import `NG8113` warnings unrelated to this phase).
- `npx prettier --check` on every touched file — passes.
- Did not run `npm test`/`npm run lint` (full suite) in this phase since no `.ts`/`.html` component logic changed — deferred to phases that touch components, and to the full Phase 7 pass.

## Deferred to later phases

- Actually consuming the new `--color-hpd-*` Tailwind tokens / Material theme in component templates (stat cards, charts, panels, navbar) — Phases 2–6.
- Removing the Bootstrap SCSS import chain (`vendor.scss`, `_bootstrap-variables.scss`) — Phase 7, once nothing still depends on Bootstrap classes.
- `.hpd-shell` in `global.scss` is confirmed dead (no template references the class anywhere in the repo) but was left in place rather than deleted, to keep this phase's diff focused on tokens only.
