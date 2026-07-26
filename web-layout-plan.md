# Web UI Migration & Refactoring Plan — BridgeCare Layout

**Source of truth for the target look:** `../Abofonsa_BridgeCare_Professional_Demo.html` (workspace root).
**Target app:** this repo (`web/`, the JHipster Angular 17 frontend).
**Prime directive:** adopt the demo's layout, typography, colors, and component styling — while keeping **every existing feature working identically**. Demo features that already exist here are restyled, not rebuilt. Only genuinely new demo features are added (Phase 6). Demo-only theatrics are explicitly excluded (§ Non-goals).

---

## 1. Gap analysis: demo vs. current app

### Already implemented here (restyle only — do not rebuild)

| Demo surface                                                                                                   | Existing implementation                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Dashboard: demographic + status stat cards, 3 charts                                                           | `health-connect/pages/dashboard-page.component.ts`, `shared/health-connect/stat-card/`, `health-connect/charts/` (line, pie, grouped-bar)  |
| Patient directory + search                                                                                     | `patient-directory-page.component.ts`                                                                                                      |
| Patient record: identity, cases, visitations, activity trail, medications, reports panels; activity-log dialog | `patient-record-page.component.ts`, `activity-log-dialog.component.ts`, `route-driven-overlay-host.component.ts`                           |
| Case detail (symptoms / diagnosis / recommendations)                                                           | `case-detail-page.component.ts`                                                                                                            |
| Case queue with urgent/open/closed tabs                                                                        | `case-queue-page.component.ts` + `shared/health-connect/data-table/` (richer than demo: row actions reopen/delete, role gating — **keep**) |
| Duty roster                                                                                                    | `duty-roster-page.component.ts` + `health-connect/api/duty-roster-api.*`                                                                   |
| Role badge, role-gated routes                                                                                  | navbar badge, `healthConnectRoleGuard`, `Authority` constants                                                                              |
| Auth, account, admin, entity CRUD, i18n en/fr/de, alerts                                                       | JHipster: `login/`, `account/`, `admin/`, `entities/professionalService/`, `shared/alert/`, `i18n/{en,fr,de}`                              |

### In the demo but missing here (new — Phase 6)

1. **Messages** page + unread badge on nav (no `messages` route or service exists).
2. **Topbar quick action** ("New patient" gold button).
3. **About / "Why Abofonsa BridgeCare"** page (the unauthenticated home is JHipster boilerplate, not this).
4. **Toast** notification pattern (bottom-center pill) — implemented as a restyle/extension of the existing JHipster alert service, not a parallel system.
5. **Breadcrumb + page title in a topbar** (currently titles only go to `document.title` via `AppPageTitleStrategy`).

### Layout/style deltas (the core of this plan)

| Aspect        | Current                              | Target (demo)                                                                                                                                                       |
| ------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell         | Horizontal white top navbar + footer | **Navy sidebar** (248px, sticky, nav groups, badges, user card) + **cream topbar** (crumb, page title, icon buttons, gold CTA) + content max-width 1120px           |
| Mobile        | Collapsing navbar                    | Off-canvas sidebar + scrim + **bottom tabbar** (5 items)                                                                                                            |
| Palette       | Indigo `#6366f1` / slate             | **Navy `#0D3058`**, **gold `#C59437`**, **cream `#F7F4EE`**, bg `#F2F0EA`, ink `#16202C`; status: ok `#2E7D5B`, warn `#B4741A`, danger `#B3402F` each with bg tints |
| Auth          | Centered card on plain page          | **Split-screen**: navy brand panel (logo, tagline, stats) + cream form panel                                                                                        |
| Stat cards    | White cards, status via badge        | Status cards get **tinted backgrounds** (`danger-bg`/`warn-bg`/`ok-bg`) + colored values + active ring                                                              |
| Lists         | Data tables                          | Demo list-rows with avatar initials + **ticket left-border** status accents (apply styling to existing data-table/list components — keep their features)            |
| Queue tabs    | Underline/rect tabs                  | **Pill tabs** with per-status active colors                                                                                                                         |
| Record panels | White rounded cards                  | Panel with **cream header strip** (uppercase label + action icon), kv rows, dashed rowlines                                                                         |
| Modals        | Existing dialog styling              | **Navy header bar** with white title + action buttons                                                                                                               |
| Radii/shadows | Tailwind defaults                    | Token scale: `8/14/20/28px` radii; navy-tinted shadow scale                                                                                                         |
| Font          | Inter (already)                      | Inter (unchanged — rule stays: single family, weights only)                                                                                                         |

---

## 2. Non-goals (demo-only, do not implement)

- Demo badge / "Restart" chrome, pre-filled credentials, "Continue as guest clinician".
- **Role selector at sign-in / profile** — roles come from the JWT account, never user-selectable. The existing role badge already covers role display.
- Fake pagers (`« 1 2 3 … 10 »`) — keep the real pagination components.
- Inline `onclick` / innerHTML rendering patterns — everything stays idiomatic Angular (standalone components, signals where already used, `jhiTranslate`).
- Downgrading the data-table to the demo's simpler list where the table has more features (sorting, actions, pagination).

## 3. Cross-cutting rules (apply to every phase)

- **Feature parity is the acceptance gate.** Before Phase 2 starts, snapshot the full route inventory (`app.routes.ts`, `entity.routes.ts`, `health-connect.routes.ts`, `admin.routes`, `account.route`) into a checklist; every phase's PR re-verifies its touched routes render and function.
- **Tokens only.** No raw hex in components — extend `--hpd-*` custom properties in `content/scss/global.scss` and map them in `content/css/tailwind.css` `@theme`, exactly as today. Keep existing token _names_ where a value swap suffices (e.g. `--hpd-color-primary` becomes navy); add new tokens (gold, cream, radii, shadows) rather than renaming, to minimize churn.
- **Preserve:** `data-cy` attributes (Cypress), `aria-*`/roles/`sr-only` headings, `jhiTranslate` keys with en/fr/de entries for every new string, `hpd` selector prefix, jhipster-needle comments, Inter-only font rule.
- **Per phase:** own branch/PR; run `npm test`, `npm run lint`, `npm run prettier:check`, `npm run webapp:prod` (build must pass); manual smoke via `npm start` against the gateway (:5505); a `phase_N` summary appended to this file or as `phase_N_summary.md` per repo convention.
- **Accessibility:** WCAG AA contrast check on every new token pair (gold-on-navy and warn-on-warn-bg are the risky ones — validate before adopting; adjust shades, not the design intent).

---

## 4. Phases

### Phase 0 — Baseline & design-token spec _(no behavior change)_

1. Extract the demo's `:root` block into a token spec table in this file: old value → new value → Tailwind utility name.
2. Capture visual baseline: screenshots of every route (desktop + 390px mobile) for before/after comparison.
3. Write the route-inventory parity checklist (§3).
4. Decide the Material M3 seed: the navy `#0D3058` primary needs a generated tonal palette (Material Theme Builder) — `material-theme.scss` already anticipates this; gold `#C59437` as tertiary.

**Test/exit:** no code change; checklist + token table reviewed.

### Phase 1 — Design tokens, typography scale, global chrome

- Swap values in `global.scss` `:root`: primary → navy family (`#0D3058`/`#12406F`/`#092239`), accent gold family (`#C59437`/`#DDB868`/`#FBF4E6`), surface → `#F2F0EA`, cream `#F7F4EE`, ink/grey/line, status trio + bg tints (replace the rose/indigo/emerald row tints with `danger-bg`/`warn-bg`/`ok-bg`).
- Add radius (`--hpd-r-sm/r/r-lg/r-xl`) and shadow (`--hpd-sh-sm/sh/sh-lg`, navy-tinted) tokens; map all new tokens into the Tailwind `@theme` block.
- Update `material-theme.scss` to the generated navy/gold M3 palette (Inter typography config unchanged).
- Global body background, scrollbar styling, chart series colors (`chart-transforms.ts` / chart components: navy, gold, `#8BA9C4`).
- Update the token documentation table at the top of `global.scss`.

**Test:** full Jest suite; visual sweep of _all_ routes — everything should look recolored but structurally identical; AA contrast checks; `webapp:prod` build.

### Phase 2 — App shell: sidebar + topbar + mobile tabbar

The largest structural change; everything else depends on it.

- New `layouts/sidebar/` component: navy panel, brand block ("Abofonsa **BridgeCare** / Professional"), grouped nav (**Care**: Dashboard, Patients, Case queue, Duty roster; **Account**: Messages _(hidden until Phase 6)_, Profile→`/account/settings`, About _(hidden until Phase 6)_; **Admin** group shown for `ROLE_ADMIN` with the existing admin menu entries; **Entities** group with the existing entity menu; **Session**: language switcher, Sign out). Active state = gold-tinted background; badge slot on nav items.
- Side-foot user card (initials avatar, name, role · status) linking to account settings.
- Rework `layouts/main/main.component.html` to the demo shell: `sidebar | main(topbar + content)`. Topbar: crumb + page title (driven by route `titleKey` data — extend `AppPageTitleStrategy` or a small `PageHeaderService`), message icon button (dot hidden until Phase 6), gold "New patient" CTA (wired in Phase 6; hidden until then).
- Responsive ≤940px: fixed off-canvas sidebar + scrim + hamburger in topbar; sticky bottom tabbar (Dashboard, Patients, Cases, Roster, Messages\*) with badge support.
- Footer: keep content, restyle to sit at content-column bottom (not full-width white bar); page ribbon stays.
- Delete/retire `layouts/navbar/` after all its functions (language, account menu, admin menu, entities menu, role badge, version) are verifiably relocated.

**Test:** navigation e2e (Cypress) across all groups incl. admin + entity screens rendering inside the new shell; keyboard nav + focus trap on off-canvas sidebar; Escape closes; i18n of all new labels; mobile viewport run; role-gated visibility (nav items match route guards).

### Phase 3 — Auth & account surfaces

- Login page → split-screen: left navy brand panel (logo block, "Clinician workspace" tag, headline, description; live stats optional — only if cheap from `dashboard-api`), right cream panel with the existing reactive form restyled (uppercase field labels, focus ring per demo). Keep all logic, validation, error banner, `data-cy` hooks. No role select, no guest button.
- Restyle `account/` screens (register, activate, password reset/change, settings) and the unauthenticated home's sign-in/register prompts with the same field/button/card patterns.
- Button system: `btn-primary` (navy), `btn-gold`, `btn-ghost`, `btn-danger` as shared classes or a directive — replace per-page ad-hoc button styling app-wide as encountered.

**Test:** login/logout/register/reset e2e; error-state rendering; settings round-trip; mobile.

### Phase 4 — Dashboard restyle

- Stat cards: 4-col demographic grid + 3-col status grid; status cards get tinted backgrounds, colored values, hover shadow, `active` ring state (existing selected-filter logic drives it). Extend the existing `stat-card` component with a `variant` input — do not fork it.
- Chart cards: white card, uppercase grey `h4` header; series colors from Phase 1 tokens; keep `hpd-async-state` wrapper, click-through navigation, aria labels.

**Test:** update dashboard/stat-card Jest specs; verify filter click-through still routes to queue with correct tab.

### Phase 5 — Care screens restyle (patients, queue, record, case, roster)

Sub-steps, each independently shippable:

- **5a Patients:** demo search input (icon-inset), list rows with initials avatar; keep existing search/filter logic and pagination.
- **5b Case queue:** pill tabs with per-status active colors; ticket left-border accents on rows; "Resolved" pill on closed items; keep data-table actions (reopen/delete) and role gating.
- **5c Patient record:** panel-grid with cream panel-head strips (uppercase label + action icon slot: edit ✎ / open ↗ / upload), `kv` identity rows, dashed rowlines with date-left/label-right; overlay host gets the navy modal header (title + Print/Edit/Close actions — Print = `window.print()` with a print stylesheet, cheap win). Activity-log dialog restyled to modal pattern.
- **5d Case detail:** 3-column symptoms/diagnosis/recommendations grid, checkbox rec-items, navy modal header with Save/Cancel.
- **5e Duty roster:** card with header row + "Subscribed" pill, dashed row separators, shift status pills (`ok`/`navy`/`warn`).
- **5f Entities + admin sweep:** apply card/button/pill/table styling to JHipster entity CRUD and admin screens so nothing looks left behind (mechanical pass; no logic changes).

**Test:** per sub-step: affected Jest specs updated, Cypress entity suite must stay green after 5f, manual parity check against Phase 0 screenshots (structure identical, skin new).

### Phase 6 — New features from the demo

Each is a separate small PR; all strings in en/fr/de.

- **6a Toasts:** extend the existing alert service/component with a demo-style bottom-center toast presentation (navy pill, check icon, auto-dismiss ~2.6s); route success confirmations (case saved, activity logged, marked read) through it. Keep the current alert region for errors/validation.
- **6b Topbar quick action:** "New patient" gold button → the existing patient/profile creation flow; hide when the user's role can't create patients (reuse existing authority logic).
- **6c Messages:** new `health-connect/pages/messages-page.component.ts` + route + sidebar/tabbar entry with unread badge. **Backend dependency:** no messages API exists in `api/` — ship UI against a thin `messages-api.service.ts` returning empty state ("No new messages…" + Mark all read) and flag the endpoint need to the backend repo; do not fake data.
- **6d About page:** "Why Abofonsa BridgeCare — Professional" static content card; route under Account group; also reuse its copy on the unauthenticated home (replacing the JHipster boilerplate links).

**Test:** unit specs per feature; badge count logic; empty states; i18n.

### Phase 7 — Cleanup, hardening, docs

- Remove retired navbar code, dead tokens/styles, unused Tailwind mappings; `npm run lint:fix`, prettier.
- Full regression: Jest, complete Cypress run, `webapp:prod` build, aXe/Lighthouse a11y pass on the five main screens.
- Update `CLAUDE.md` + `AGENTS.md` UI-conventions sections: BridgeCare palette tokens, sidebar shell architecture, toast pattern (Inter-only rule unchanged).
- After/Before screenshot set appended to the phase summaries.

---

## 5. Sequencing & risk notes

- Order is strict for 0→1→2 (tokens before shell, shell before page restyles); 3–5 can proceed in parallel branches after 2; 6 after 5; 7 last.
- **Biggest risk: Phase 2** (shell swap breaks navigation affordances). Mitigate by keeping the old navbar component intact until the parity checklist passes, then removing it in the same PR only when green.
- Material M3 navy palette generation (Phase 0.4) is the only external-tool step — if it stalls, Phase 1 can ship with `mat.$azure-palette` as a stopgap and swap later; Material widgets are a minority of the UI.
- The gold-on-navy and status-on-tint contrast pairs may need shade adjustments to hit AA — treat token values as tunable, layout as fixed.

---

## Appendix A — Token spec (Phase 0.1, implemented in Phase 1)

Demo `:root` → app tokens (`content/scss/global.scss`) → Tailwind utilities (`content/css/tailwind.css` `@theme`). Measured WCAG ratios in parentheses.

| Demo token                             | Value                             | App token                                                                                                                                                      | Tailwind utility                                                   |
| -------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `--navy`                               | `#0D3058`                         | `--hpd-color-primary(-blue)` (was `#6366f1`)                                                                                                                   | `bg/text/ring-hpd-primary`                                         |
| `--navy-700`                           | `#12406F`                         | `--hpd-color-primary-hover` (new)                                                                                                                              | `*-hpd-primary-hover`                                              |
| `--navy-900`                           | `#092239`                         | `--hpd-color-primary-deep` (new); shell bg end                                                                                                                 | `*-hpd-primary-deep`                                               |
| `--gold` / `--gold-300` / `--gold-050` | `#C59437` / `#DDB868` / `#FBF4E6` | `--hpd-color-gold(-bright/-tint)` (new)                                                                                                                        | `*-hpd-gold`, `*-hpd-gold-bright`, `*-hpd-gold-tint`               |
| `--cream`                              | `#F7F4EE`                         | `--hpd-color-cream` (new)                                                                                                                                      | `*-hpd-cream`                                                      |
| `--bg`                                 | `#F2F0EA`                         | `--hpd-color-surface` (was `#f8fafc`)                                                                                                                          | `bg-hpd-surface`                                                   |
| `--card`                               | `#FFFFFF`                         | `--hpd-color-card-neutral` (unchanged)                                                                                                                         | `bg-hpd-neutral`                                                   |
| `--ink`                                | `#16202C`                         | `--hpd-color-text-primary` (was `#0f172a`)                                                                                                                     | `text-hpd-primary-dark`                                            |
| `--grey`                               | `#5B6470`                         | `--hpd-color-text-muted` (was `#64748b`)                                                                                                                       | `text-hpd-muted` (5.3:1 on `--bg`)                                 |
| `--grey-400`                           | `#8B939E`                         | `--hpd-color-text-subtle` (new)                                                                                                                                | `text-hpd-subtle` (large/bold text only — 3.1:1 on white)          |
| `--line`                               | `#E6E2D9`                         | `--hpd-color-border` (was `#e2e8f0`)                                                                                                                           | `border-hpd-border`                                                |
| `--ok` / `--ok-bg`                     | `#2E7D5B` / `#E7F3ED`             | `--hpd-color-success` **text tone darkened to `#2A7554`** (4.39→4.89 on tint); `#2E7D5B` kept as `--hpd-color-success-accent`; tint `--hpd-color-success-tint` | `text-hpd-success`, `bg-hpd-success-accent`, `bg-hpd-success-tint` |
| `--warn` / `--warn-bg`                 | `#B4741A` / `#FDF3E2`             | `--hpd-color-warning` **text tone darkened to `#96600F`** (3.50→4.80 on tint); `#B4741A` kept as `--hpd-color-warning-accent`; tint `--hpd-color-warning-tint` | `text-hpd-warning`, `bg-hpd-warning-accent`, `bg-hpd-warning-tint` |
| `--danger` / `--danger-bg`             | `#B3402F` / `#FBEAE7`             | `--hpd-color-danger(-tint)` (4.88 on tint — no adjustment)                                                                                                     | `text-hpd-danger`, `bg-hpd-danger-tint`                            |
| (chart series)                         | navy / gold / `#8BA9C4`           | `--hpd-color-chart-navy/gold/blue`                                                                                                                             | n/a — Chart.js config (`chart-transforms.ts`)                      |
| `--r-sm/--r/--r-lg/--r-xl`             | 8/14/20/28px                      | `--hpd-r-sm/r/r-lg/r-xl` (new)                                                                                                                                 | `rounded-hpd-sm/hpd/hpd-lg/hpd-xl`                                 |
| `--sh-sm/--sh/--sh-lg`                 | navy-tinted shadows               | `--hpd-sh-sm/sh/sh-lg` (new)                                                                                                                                   | `shadow-hpd-sm/hpd/hpd-lg`                                         |
| row tints (open=warn semantics)        | status tints                      | `--hpd-color-row-urgent/open/closed` (were rose/indigo/emerald-50)                                                                                             | `bg-hpd-row-*`                                                     |
| stat-card tints                        | status tints                      | `--hpd-color-card-urgent/open/closed` (were white; pre-tinted for Phase 4)                                                                                     | `bg-hpd-urgent/open/closed`                                        |

Other verified pairs: gold on navy 4.85; gold-300 on navy 7.04; white on navy 13.28; `#3A2A08` on gold (btn-gold text) 5.06; navy on cream 12.10. **White on gold fails (2.74) — never put white text on gold; use `#3A2A08` like the demo's `btn-gold`.**

Removed as unused (verified zero references): `--hpd-color-accent-teal`, `--hpd-color-accent-teal-dark`.

## Appendix B — Route inventory / parity checklist (Phase 0.3)

Every phase PR re-verifies its touched routes against this list (render + function identical). Verified against the route files on 2026-07-26.

| Route                                                                                                                                 | Source                                                  | Guard                                            |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------ |
| `/` (welcome unauth / dashboard authed)                                                                                               | `app.routes.ts` → `home`                                | —                                                |
| `/login`                                                                                                                              | `app.routes.ts`                                         | —                                                |
| `/account/register`, `/account/activate`, `/account/password`, `/account/reset/request`, `/account/reset/finish`, `/account/settings` | `account/account.route.ts`                              | settings/password need auth                      |
| `/admin/health`, `/admin/metrics`                                                                                                     | `admin/admin.routes.ts`                                 | `ROLE_ADMIN`                                     |
| `/dashboard`, `/patients`, `/patients/:id` (+ `/cases/:caseId` child), `/cases`, `/cases/:caseId`, `/duty-roster`                     | `health-connect/health-connect.routes.ts`               | clinician authorities + `healthConnectRoleGuard` |
| `/med-case`, `/med-case/new`, `/med-case/:id/view`, `/med-case/:id/edit`                                                              | `entities/entity.routes.ts` → `patientService/med-case` | authenticated                                    |
| `/error`, `/accessdenied`, `/404`, `**`                                                                                               | `layouts/error/error.route.ts`                          | —                                                |

Note: `entities/professionalService/*` components exist but are **not routed**; the navbar's entities menu and admin menu contents are the parity source for Phase 2's sidebar groups.

## Appendix C — Phase status log

### Phase 0 — done (2026-07-26)

- Token spec: Appendix A.
- Route inventory: Appendix B.
- Visual baseline: `docs/ui-baseline/pre-bridgecare/` — 18 shots (desktop 1440×900 all routes incl. admin/account/entity; mobile 390×844 for dashboard/patients/cases/duty-roster/login/welcome), captured against the live dev stack (gateway :5505, api :8081) authenticated as the seeded admin (see `gateway/.../InitialSetupMigration.java` for dev credentials). Capture is reproducible via `docs/ui-baseline/capture.py` (headless Chrome CDP; needs `websockets`; `SETTLE=7` or higher for Chart.js canvases — the pre-bridgecare dashboard shots used a shorter settle, so chart canvases are blank there; card/layout content is what the baseline is for).
- M3 seed: generated `content/scss/_theme-colors.scss` via `ng generate @angular/material:theme-color --primary-color="#0D3058" --tertiary-color="#C59437"` (no Theme Builder round-trip needed).

### Phase 1 — done (2026-07-26)

Changed: `content/scss/global.scss` (token block + doc table, scrollbar chrome, link colors → primary tokens, body weight 300→400 per demo typography), `content/css/tailwind.css` (@theme mappings incl. new radius/shadow namespaces), `content/scss/material-theme.scss` (violet stopgap → generated navy/gold palettes), `content/scss/_theme-colors.scss` (generated), `health-connect/charts/chart-transforms.ts` (+spec) BridgeCare series/status colors, `shared/health-connect/stat-card/stat-card.component.ts` badge/bar/selected-ring classes → status tokens (kept in agreement with the doughnut per the existing comment contract).

Verification: 315/315 Jest, ESLint clean, prettier clean, `webapp:prod` build green; post-change shots in `docs/ui-baseline/phase1-bridgecare-tokens/` confirm the recolor (surface `#F2F0EA`, danger/warn/ok status cards, navy/gold charts).

Notes & deviations:

- `--hpd-color-success`/`--hpd-color-warning` text tones darkened from demo values for AA (Appendix A); demo hues live on as `*-accent` tokens.
- Stat-card status _tints_ went into the `--hpd-color-card-*` tokens now (pure value swap), but the component still renders white cards — switching it to the tinted variants + active ring is Phase 4 as planned.
- Raw Tailwind slate/indigo classes hardcoded in components (navbar, buttons, page chrome) are untouched by design — they are swept per page in Phases 2–5. Phase 1 recolors everything token-driven: page surface, links, focus ring, Material widgets, charts, stat-card status colors, data-table row tints.
- `--hpd-content-max-width` stays 1280px until the Phase 2 shell (demo is 1120px).

### Phase 2 — done (2026-07-26)

The horizontal JHipster navbar was replaced by the BridgeCare shell: navy **sidebar** (`layouts/sidebar/`, 248px, sticky, off-canvas + scrim below `lg`), cream **topbar** in `layouts/main/` (hamburger, crumb + page title), mobile **tabbar** (`layouts/tabbar/`, Dashboard/Patients/Cases/Roster), restyled footer. `layouts/navbar/` deleted after full relocation.

- Nav model lives in `layouts/sidebar/shell-navigation.ts` (groups: Care; Administration for `ROLE_ADMIN` with Med Cases/Metrics/Health — mirroring the old admin dropdown; Account; Session with language switcher + sign in/out). It also drives the tabbar and the topbar crumb/title resolution (route `titleKey` data → nav item label → route `title` → app title).
- Parity relocations (Appendix B verified): primary nav, admin menu, language switcher (`jhiActiveMenu` moved to `layouts/sidebar/active-menu.directive.ts`), account menu → Account group + side-foot user card (initials/avatar, name, role · shift — keeps `data-cy` `healthConnectRoleBadge`/`healthConnectShiftLabel`), version → brand block, login/logout, all other `data-cy` hooks (`navbar`, `navbarToggle`, `adminMenu`, `settings`, `passwordItem`, `logout`, `login`, `accountMenu`).
- A11y: `aria-expanded` on the toggle, Escape closes, scrim click closes, `invisible` while closed keeps off-screen links out of the tab order; sidebar closes on every navigation.
- New tokens: `--hpd-color-on-navy-muted/soft/faint` (demo sidebar text tones). New i18n keys (en/fr/de): `healthConnect.navigation.care/overview/session/menu`, `healthConnect.brand.*`.
- Deviations: breakpoint is Tailwind `lg` (1024px) instead of the demo's 940px; the topbar message icon + "New patient" CTA are omitted (not hidden) until Phase 6; tabbar has 4 items until Messages exists. Because Tailwind preflight isn't loaded, shell links/buttons carry explicit `no-underline`/`border-0 bg-transparent` resets.
- Known cosmetic follow-up for Phase 5: pages still render their own in-content heading, duplicating the topbar title.
- Verification: 319/319 Jest (navbar spec ported to `sidebar.component.spec.ts` + new group-visibility/initials coverage), ESLint, prettier, `webapp:prod` green; shots in `docs/ui-baseline/phase2-shell/` (desktop + mobile).

### Phase 3 — done (2026-07-26)

- Shared BridgeCare form/button classes in `global.scss`: `.hpd-btn` + `-primary/-gold/-ghost/-danger`, `.hpd-label`, `.hpd-input`, `.hpd-auth-brand` (radial-glow navy panel).
- Login is the demo split-screen: navy brand panel (AB tile, "Clinician workspace" tag, headline, description — inside the shell content column, not a full-screen takeover; stats intentionally omitted) + cream form panel. All form logic, validation, `data-cy` hooks unchanged. No role selector, no guest login (non-goals).
- Account surfaces swept to the new classes (register, activate, password, password-reset init/finish, settings) plus the unauthenticated home prompts: uppercase `.hpd-label` labels, `.hpd-input` fields, `.hpd-btn-primary` submits, danger/success/gold-tint banners replacing rose/emerald/amber/indigo. Password-strength bar kept its traffic-light scale (semantic, not brand).
- Validation-state rule scoped: `.ng-invalid.ng-touched` (was any `.ng-invalid`, which painted pristine required fields red) and recolored to status tokens — feedback still appears after interaction.
- New i18n keys (en/fr/de): `healthConnect.brand.tagline/description/signInHint`.
- Verification: 319/319 Jest, ESLint, prettier, `webapp:prod` green; shots in `docs/ui-baseline/phase3-auth/`.

### Phase 4 — done (2026-07-26)

- `stat-card.component.ts` rebuilt to the demo `.stat-card` anatomy: uppercase label + large colored value; status variants use the tinted `bg-hpd-urgent/open/closed` backgrounds staged in Phase 1; selected state = navy border + soft navy ring (`hpd-stat-card--selected` class retained); hover shadow. The old badge pill and decorative bar were dropped — the demo conveys status via card tint, not badge (visual change only; variant input, link/button/static modes, aria-pressed/aria-current, and click-through all unchanged).
- `stat-card-row` gained a `columns` input (4 default; 3 for case-status rows per the demo's two grids) — applied on the dashboard and case-queue pages.
- Chart cards (line/pie/grouped-bar) took the demo `.chart-card` skin: white card, tiny uppercase grey header, `figure`/`figcaption`/`role="img"` a11y structure kept. Layout: **one chart per row, `w-full`, `h-[600px] max-h-[600px]`** — the demo's 3-across compact grid was tried first but reverted to full-width rows by owner decision (2026-07-26).
- Case-queue status cards inherit all of this automatically (shared components).
- Verification: 319/319 Jest (dashboard click-through specs untouched and green), ESLint, prettier, `webapp:prod` green; shots in `docs/ui-baseline/phase4-dashboard/` — desktop dashboard now visually matches the demo above the fold.

### Phase 5 — done (2026-07-26)

All care screens, shared components, and the entity/admin surfaces swept to BridgeCare; **zero raw Tailwind palette classes (`slate/rose/emerald/amber/indigo-*`) remain in non-spec app code** (verified by grep).

- **5a Patients:** directory card, filters, and search restyled via the shared components; page `h1` made `sr-only` (topbar already shows the title — same fix on queue and roster).
- **5b Case queue:** scope tabs ("All cases"/"My roster") are demo `.qtab` pills (navy-active); the data-table gained the demo `.ticket` left-border status accents (inset box-shadow on the first cell, keyed off the existing `hpd-data-table--<status>` marker classes so specs stay green); header tint + row actions + role gating untouched.
- **5c Patient record:** panels are the demo `.panel` pattern — cream header strips (negative-margin technique, uppercase label + icon) on white panels; the route-driven overlay host got the demo `.modal-top`: navy header bar, white title, on-navy ghost Print/Close. The shared `hpd-dialog` got the same navy header + body padding. Activity-log dialog restyled (gold Save, ghost Cancel).
- **5d Case detail:** 3-column symptoms/diagnosis/recommendations retained; actions now Print (ghost) / Cancel (ghost) / **Save (gold)** per the demo's case modal. Read-only gating unchanged.
- **5e Duty roster:** roster cards with token borders; shift pills mapped to the demo trio (active→ok, upcoming→navy `#E7EEF6`, completed→warn); subscribe (navy) / unsubscribe (ghost) buttons.
- **5f Entities + admin sweep:** med-case list/detail/update/delete, admin health/metrics (incl. thread-state badges), error pages, alerts (`shared/alert` — success/danger/warning/info now status-token banners; this is also the base Phase 6a restyles into toasts), progress-bar, filter chips, pagination, async-state.
- Adopted the demo's **global button reset** (`button { cursor:pointer; border:none; background:none }`) in `global.scss` — the demo's own CSS relies on it, Tailwind preflight isn't loaded, and every app button carries explicit classes (Material restyles itself on top). Panel `<ul>`s got `list-none` (no preflight ⇒ native bullets).
- Spec updates: admin health/metrics badge-class expectations moved to the token classes.
- Pre-existing issue noticed (not caused by this phase, left for later): the case-detail recommendation labels render as `translation-not-found[...]` — the mock repository feeds literal labels where the checkbox-list expects i18n keys.
- Verification: 319/319 Jest, ESLint, prettier (whole app reformatted), `webapp:prod` green; shots in `docs/ui-baseline/phase5-care-screens/` (queue with ticket accents + pills, patient-record and case-detail overlays with navy modal-top, roster, med-case, admin).

### Phase 6 — done (2026-07-26)

- **6a Toasts:** `AlertService.showToast(key, params?)` (success, `toast: true`, 2.6s auto-dismiss — named `showToast` because the service already had a `toast` config property). New `shared/alert/toast-outlet.component.ts` renders toast alerts as the demo's bottom-center navy pill with gold check (raised above the tabbar on mobile); mounted once in the main layout. The banner `hpd-alert` now filters toasts out so nothing double-renders. Wired into: case save, activity log, report upload, roster subscribe/unsubscribe, mark-all-read.
- **6b Topbar quick action:** gold "New patient" button + demo message icon (with unread dot slot) in the topbar. CTA is gated by `hasHealthConnectPermission('managePatient')` (admin/doctor) and — like the demo, which also just calls `go('patients')` — navigates to `/patients`, because **no patient-creation flow/endpoint exists yet**; retarget it when one lands.
- **6c Messages:** `/messages` route (clinician-guarded), `health-connect/api/messages-api.service.ts` (signal API, intentionally empty inbox — **backend dependency flagged in-code**: no messages endpoint in `gateway/`/`api/`), page with empty state + disabled-until-unread "Mark all as read", sidebar Account item + 5th tabbar item with gold unread badges, topbar dot. Badge plumbing: `ShellNavItem.badge: 'unreadMessages'` resolved via DI in sidebar/tabbar.
- **6d About:** `/about` "Why Abofonsa BridgeCare — Professional" page under the Account group; the unauthenticated home's JHipster boilerplate link list was replaced with the same BridgeCare copy.
- i18n (en/fr/de): `healthConnect.navigation.messages/about`, `healthConnect.messages.*`, `healthConnect.about.*`, `healthConnect.toast.*`, `healthConnect.actions.newPatient/markAllRead`.
- New specs: messages service (empty inbox contract) and messages page (empty state, disabled button, toast on mark-all-read).
- Verification: 323/323 Jest (the existing route-coverage spec picked up the two new routes and passes), ESLint, prettier, `webapp:prod` green; shots in `docs/ui-baseline/phase6-features/`.

### Phase 7 — done (2026-07-26) — migration complete

**Cleanup (all removals grep-verified as zero-usage first):**

- Deleted the orphan `health-connect/pages/feature-page.component.ts` and the empty `app/pages/` directory.
- Pruned dead tokens/classes from `global.scss`: shell tokens (`--hpd-color-shell-*`, `--hpd-shell-border-width`) + `.hpd-shell`, `.hpd-container` + `--hpd-content-max-width`, `.hpd-stat-grid`/`.hpd-panel-grid` (+ their media queries), action tokens (`--hpd-color-action-edit/copy/close`), `--hpd-color-card-neutral`, `--hpd-font-display`, and the legacy `.alerts .hpd-toast` positioning CSS (toasts render via the Phase 6 outlet). Matching Tailwind `@theme` mappings removed (`hero`, `neutral`, `edit`, `copy`, `close`). Kept: `.hpd-surface` (overlay host + print styles), `.browserupgrade` (index.html).
- `web/CLAUDE.md`, `web/AGENTS.md`, and the workspace `CLAUDE.md` updated to post-migration reality: Angular 19, BridgeCare token/shell/toast conventions ("no raw palette classes" rule), `layouts/` composition (no navbar), actual entity routing (`patientService/med-case` only), corrected folder inventory.

**Hardening:**

- **axe-core WCAG 2 A/AA audit** (headless CDP, five screens: login, dashboard, patients, cases, patient-record): three finding types on first run, all fixed — sidebar group-label tone lightened `#7E96B2`→`#93AAC6` (4.36→5.57 on navy); queue scope tabs switched from invalid `role="tab"`+`aria-pressed` to `role="group"` toggle-button semantics (also a pre-existing bug); hidden file-upload input given an `aria-label`. **Re-run: 0 violations on all five screens.**
- Full regression: 323/323 Jest, ESLint, prettier, `webapp:prod` — all green after cleanup.
- Final after-set: `docs/ui-baseline/post-bridgecare/` (18 shots, same routes/viewports as `pre-bridgecare/` for side-by-side comparison; `capture.py` reproduces both).

**Known follow-ups (out of migration scope):** messages backend endpoint (Phase 6c flag), retargeting the "New patient" CTA once a patient-creation flow exists (Phase 6b flag), the mock recommendation-label i18n quirk (Phase 5 note), and restoring a working Cypress config (the `src/test/javascript/cypress/e2e` specs have no `cypress.config` — predates this migration).
