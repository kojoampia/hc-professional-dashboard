# Professional Dashboard Migration Plan

**Status:** Planning only — no implementation yet.
**Design source of truth:** `professional-demo.html` (indigo/slate, Material Icons, Chart.js, modal-based detail views). `professional-dashboard-demo.html` is an earlier iteration (navy hero shell, teal accent, full-page detail views) and is superseded by it — kept only as historical reference for copy/labels/mock-data shapes.

## Context

The current landing experience (`/`, `HomeComponent` → `<jhi-dashboard>`, `src/main/webapp/app/dashboard/`) is a Bootstrap 5 + `@swimlane/ngx-charts` screen wired to almost no real data (`DashboardService` only fetches `phoneNumber`/`membership` by email; the four demographic tiles and four "urgent/open/cases/notifications" tiles are hardcoded numbers in the component). It needs to become the polished, data-real screen shown in `professional-demo.html`, and the app's design system needs to move off Bootstrap/ng-bootstrap onto Angular Material M3 + Tailwind CSS v4 — which are already partially wired into the build (see below) but barely used.

**Important discovery that reshapes this plan:** a second, more advanced implementation of this exact feature set already exists at `src/main/webapp/app/health-connect/` (plus supporting pieces in `src/main/webapp/app/shared/health-connect/`). It is not mentioned in `CLAUDE.md` (which predates it) and is not the app's landing surface, but it already provides:

- Standalone, signal-based, accessible page components for **Dashboard, Patient Directory, Patient Record, Case Queue, Case Detail, Duty Roster** (`app/health-connect/pages/*.component.ts`), routed at `/dashboard`, `/patients`, `/patients/:id`, `/patients/:id/cases/:caseId`, `/cases`, `/cases/:caseId`, `/duty-roster` via `app/health-connect/health-connect.routes.ts` (already registered at the app root in `app.routes.ts`).
- Shared UI primitives with the right shape already: `hpd-stat-card`/`hpd-stat-card-row`, `hpd-data-table`, `hpd-async-state`, `hpd-dialog`, form controls (`shared/health-connect/*`).
- A typed domain model (`health-connect.models.ts`: `ClinicalCase`, `PatientRecord`, `DutyRoster`, etc.) and a role/permission layer (`authority-role.ts`, `authority-role.guard.ts`) matching the demo's DOCTOR/NURSE/PARAMEDIC/etc. authority matrix.
- Full i18n (`healthConnect.*` translation keys) and ARIA-conscious markup throughout.

What it does **not** yet have: any real HTTP call (everything runs off `MockHealthConnectRepository`, an in-memory fixture store), Chart.js (charts use `ngx-charts` today), or Material M3/Tailwind styling (components use hand-rolled CSS keyed to the *old* demo's color tokens, already sitting in `content/scss/global.scss` as `--hpd-color-*` custom properties).

**Consequence for this plan:** this is not a "build the dashboard/patients/cases pages" project — most of that structural and accessibility work is done. It is a **consolidation, restyling, and real-data-wiring** project:
1. Retire the legacy `app/dashboard/` module and `HomeComponent`'s embedded dashboard.
2. Make `app/health-connect/` the one true implementation, promoted to be what users land on.
3. Re-theme it from the old token set to the new `professional-demo.html` palette, in Tailwind + Material M3 instead of hand-rolled CSS.
4. Swap `ngx-charts` for Chart.js (via `ng2-charts`) in the three dashboard charts only.
5. Replace `MockHealthConnectRepository` with real `HttpClient`-backed services against the contracts defined in Phase 1.
6. Separately, carry the same Bootstrap → Material M3 + Tailwind migration through the rest of the app (navbar/footer/shell, the 14 generated entity CRUD modules), since the task explicitly scopes that as a whole-app migration.

Decisions already made with the user (recorded here so later phases don't re-litigate them):
- **Scope:** whole-app Bootstrap → Material M3 + Tailwind, not just the dashboard.
- **Charts:** switch to Chart.js/`ng2-charts` for the dashboard; leave `ngx-charts` alone in `widgets/` and other non-dashboard consumers (separate concern).
- **Data:** specify real REST contracts now (Phase 1) rather than shipping more mock data — DashboardService/HealthConnect repository should call real endpoints once available; the contracts below are the spec the backend team implements against.
- **Patients/Cases:** in scope, including the Duty Roster page, since `app/health-connect/` already covers them.

## Current-state inventory (facts gathered, for reference during execution)

| Area | Current state |
|---|---|
| Landing route `/` | `HomeComponent` → `<jhi-dashboard [account]>` (`app/dashboard/dashboard.component.ts`), Bootstrap grid, hardcoded numbers, `ngx-charts-number-card` for tiles |
| `/dashboard`, `/patients`, `/cases`, `/duty-roster` | `app/health-connect/health-connect.routes.ts`, mock-data only, `ngx-charts` line/pie/grouped-bar, custom CSS |
| Angular Material | `^19.2.19` installed; only real usage is `MatDialogModule`/`MatDialog` in `shared/health-connect/dialog/confirm-dialog.component.ts` (itself unused/orphaned — nothing calls `HealthConnectDialogService`). `angular.json` still loads `node_modules/@angular/material/prebuilt-themes/azure-blue.css` (M2-style prebuilt theme, not M3) |
| Tailwind | `tailwindcss ^4.3.3` + `@tailwindcss/postcss` installed, wired via `content/css/tailwind.css` in `angular.json` styles array. `@theme` block maps `--color-hpd-*` to the **old** demo's `--hpd-color-*` tokens in `global.scss` (navy/teal palette) — needs remapping to the new indigo/slate palette |
| Bootstrap | `bootstrap 5.3.2` + `@ng-bootstrap/ng-bootstrap ^18.0.0`, imported wholesale via `content/scss/vendor.scss` + `global.scss` (`_bootstrap-variables.scss` sets `$primary: #1b67e2`, etc.) and re-exported app-wide through `shared/shared.module.ts` (`NgbModule`, `FontAwesomeModule`) |
| Bootstrap footprint | `layouts/navbar` (365 lines, `ngbCollapse`, 4× `ngbDropdown`, ~25 `fa-icon`s, entity-menu items generated per entity), `layouts/main` (minimal, `container-fluid` only), `layouts/footer` (Bootstrap grid utilities only), `layouts/profiles/page-ribbon` (framework-agnostic already). All 14 entity CRUD modules (13 under `entities/professionalService/*` + `entities/patientService/med-case`, plus `entities/user`) follow one generated pattern: `btn btn-*`, `table table-striped`, Bootstrap modal markup for delete dialogs (opened via `NgbModal`), `ngbDatepicker` on every date field, `fa-icon` everywhere |
| `shared/` | `shared.module.ts` re-exports `NgbModule`+`FontAwesomeModule`; `alert`/`alert-error` use `<ngb-alert>` directly; `sort`/`filter`/`pagination` are framework-agnostic but FontAwesome-coupled (sort icon swap) |
| Case domain backend | `entities/patientService/med-case` is the only real (JHipster-generated) case-like entity: `{ id, symptoms, diagnoses, recommendations, createdDate, createdBy, modifiedDate, modifiedBy }` via `getEndpointFor('api/med-cases')`. **No** `patientId`, `status`, or roster-assignment field — the demo's `ClinicalCase` model needs backend schema additions |
| Patient domain backend | **No patient/demographic entity exists anywhere in this repo or its microservices as currently generated.** `entities/professionalService/profile` is the *professional's own* profile (name/DOB/phone/email/team), not a patient record. The Patient Directory/Record pages currently run entirely on `health-connect.fixtures.ts` mock data — a real Patient resource must be created backend-side (out of this repo per `CLAUDE.md`: backend lives in separate services) |
| Duty Roster backend | No roster/shift entity exists; `entities/professionalService/team` is the closest existing concept but has no shift/subscription model |
| Naming inconsistency | Entity templates use `hpdTranslate="..."` attributes, but the only translate directive defined in the codebase is `[jhiTranslate]` (`shared/language/translate.directive.ts`) — pre-existing bug, worth fixing while touching these templates in Phase 6 |

## Phase 0 — Design tokens & Material M3 theme foundation

Goal: one shared token layer both Tailwind utilities and Material components read from, matching `professional-demo.html` exactly.

1. Replace the `--hpd-color-*` values in `content/scss/global.scss` with the new palette from `professional-demo.html`'s `@theme` block (`--color-primary-blue: #6366f1`, `--color-shell-bg-start/end: #0f172a`, `--color-surface: #f8fafc`, `--color-text-muted: #64748b`, `--color-success: #10b981`, row-tint colors, `--color-highlight-edit`/`--color-highlight-copy`, etc.). Keep the `--hpd-*` naming prefix for continuity with existing consumers (`shared/health-connect/*` components already reference `--hpd-color-shell-border` etc.) but repoint the values.
2. Update `content/css/tailwind.css`'s `@theme` block to map `--color-hpd-*` Tailwind tokens onto the refreshed `--hpd-color-*` variables (same mechanism already in place — just new values + a few new tokens: `primary` indigo, `highlight-edit`, `highlight-copy`).
3. Add Material Icons font loading (`index.html` `<link>` for `Material+Icons`, matching the demo) since the target design uses `<span class="material-icons">` glyphs, not FontAwesome or inline SVG.
4. Replace the M2 prebuilt theme with a real Material 3 theme:
   - Remove `node_modules/@angular/material/prebuilt-themes/azure-blue.css` from `angular.json` `styles`.
   - Add `content/scss/material-theme.scss` using the Angular Material 19 M3 theming API (`@use '@angular/material' as mat; $theme: mat.define-theme(...)`) with a custom indigo primary palette (seed `#6366f1`) and slate neutral, `mat.core()` + `mat.all-component-themes($theme)`, registered in `angular.json` styles ahead of `tailwind.css` (so Tailwind utilities can still override at the component level where needed).
   - Confirm/add `provideAnimations()` (currently `BrowserAnimationsModule` via `importProvidersFrom` in `app.config.ts` — fine, no change needed, just verify it stays registered once Material components are used more broadly).
5. Document the token contract (old name → new value → Tailwind class → Material theme slot) in a short table at the top of `global.scss` so Phase 5/6 authors don't have to re-derive it.

## Phase 1 — Data contracts (spec now, implement backend separately)

Since the mock repository must be replaced with real calls, define the contracts every Angular service in this repo will be built against. All paths go through `ApplicationConfigService.getEndpointFor(api, microservice?)`.

**Dashboard summary** — new endpoint, `patientService` microservice:
```
GET services/patientService/api/dashboard/summary
→ { patients, female, male, kids, urgent, open, closed }
```

**Dashboard chart series** — new endpoints, `patientService`:
```
GET services/patientService/api/dashboard/case-timeline?months=6   → [{ month, newCases, resolvedCases }]
GET services/patientService/api/dashboard/case-distribution        → [{ label, value }]   // routine/follow-up/critical
GET services/patientService/api/dashboard/case-by-patient-group    → [{ group, new, returning }]  // kids/adults/seniors
```

**Patient Directory / Record** — requires a **new backend `Patient` entity** (does not exist today):
```
GET  services/patientService/api/patients?query=&page=&size=&sort=
  → Page<{ id, patientName, lastActivityAt, sex, isChild }>
GET  services/patientService/api/patients/:id
  → { id, patientName, sex, isChild, dateOfBirth, phone, email, emergencyContact?, avatarUrl?,
      cases: CaseSummary[], visitations: [...], activities: [...], medications: [...], reports: [...] }
```

**Case Queue / Case Detail** — extends the existing `med-case` entity rather than replacing it:
```
Backend schema addition to med-case: patientId (uuid), status ('urgent'|'open'|'closed'),
  assignedRosterId (uuid, nullable), brief (short-text summary distinct from full symptoms/diagnoses)
GET   services/patientService/api/med-cases?status=&rosterId=&patientId=&page=&size=
PATCH services/patientService/api/med-cases/:id        // existing partialUpdate, extend DTO with new fields
```
Update `entities/patientService/med-case/med-case.model.ts` and `service/med-case.service.ts` to carry the new fields once the backend exposes them; keep the existing generated CRUD screens working throughout (Phase 6 restyles them, doesn't replace their data layer).

**Duty Roster** — requires new backend entities (no existing analog):
```
GET  services/professionalService/api/duty-rosters                       → DutyRoster[]
POST services/professionalService/api/duty-rosters/:id/subscription      // subscribe
DELETE services/professionalService/api/duty-rosters/:id/subscription    // unsubscribe
```

Angular-side, replace `HEALTH_CONNECT_REPOSITORY`'s `MockHealthConnectRepository` implementation with an `HttpHealthConnectRepository` that calls these endpoints, keeping the same injection-token interface so `app/health-connect/pages/*` components don't need to change their consumption code — only the repository implementation swaps. Keep the mock implementation around (behind a config flag or purely for `*.spec.ts`) so component tests don't need a live backend.

## Phase 2 — Dashboard screen

Target: `app/health-connect/pages/dashboard-page.component.ts`, replacing what `professional-demo.html`'s `renderDashboard()` shows.

1. Restyle `hpd-stat-card`/`hpd-stat-card-row` (`shared/health-connect/stat-card/*`) with Tailwind utility classes matching the demo's card markup (`bg-white rounded-2xl p-5 shadow-sm border border-slate-100`, badge + progress-bar-style bottom accent, hover/focus states) instead of the current hand-rolled CSS block.
2. Add `ng2-charts` dependency; replace the three `hpd-*-chart` components' `NgxChartsModule` usage with `<canvas [type]="'line'|'doughnut'|'bar'" [data]="..." [options]="...">` (Chart.js via `ng2-charts`'s `BaseChartDirective`), preserving each component's existing `titleKey`/`descriptionKey`/`legendKey`/`xAxisKey`/`yAxisKey` inputs and ARIA wrapper (`<figure>`/`<figcaption>`/`role="img"`) so the accessibility contract doesn't regress. Match the demo's exact chart configs (line: cases-over-time with fill; doughnut: routine/follow-up/critical with `cutout: '70%'`; bar: grouped new/returning per patient group).
3. Wire `DashboardPageComponent` to the new `case-timeline`/`case-distribution`/`case-by-patient-group` endpoints (via the repository) instead of `repository.charts()` mock signals — same computed-signal shape, new data source underneath.
4. Retire `app/dashboard/` (component, `metric-panel/`, `status-panel/`, `dashboard.service.ts`) and `HomeComponent`'s `<jhi-dashboard>` embed. Point the landing route: authenticated users hitting `/` redirect to `/dashboard` (health-connect); `HomeComponent` keeps its anonymous marketing content only. Update `app.routes.ts`/`HomeComponent` accordingly.
5. Remove `@swimlane/ngx-charts` from `package.json` only if Phase 7's audit confirms no other dashboard-adjacent code needs it (`widgets/`, `health-connect/charts/`'s other two consumers, `entities` none — see inventory; likely stays as a dependency for `widgets/`).

## Phase 3 — Patient Directory & Patient Record

1. Restyle `patient-directory-page.component.ts` (search input, `hpd-data-table`) with Tailwind (`rounded-2xl shadow-sm border`, Material `mat-form-field`/`matInput` + `mat-icon` for the search box instead of a plain `<input>` with FontAwesome).
2. Restyle `patient-record-page.component.ts` and its child panels (Identity/Cases/Visitations/Activity/Medications/Reports) to match the demo's card grid (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`), each panel `bg-white rounded-xl shadow-sm border border-black/5 p-5`, Material Icons (`badge`, `folder_shared`, `event`, `timeline`, `medication`, `summarize`) replacing FontAwesome/inline SVG glyphs.
3. Decide the presentation container: the demo renders Patient Record as a **modal overlay** over the Patients list; `app/health-connect/pages/route-driven-overlay-host.component.ts` already implements a route-driven modal host for exactly this pattern (`/patients/:patientId`) — restyle it as a Material-flavored dialog surface (backdrop blur, `role="dialog"`, focus trap already implemented) rather than introducing `MatDialog` itself, since the route-driven URL-addressable modal is a deliberate, already-built pattern worth keeping.
4. Wire to the new `GET /api/patients` / `GET /api/patients/:id` contracts from Phase 1.
5. `activity-log-dialog.component.ts` (already hand-rolled, non-Material) gets the same Tailwind/Material Icons pass, no structural change.

## Phase 4 — Case Queue, Case Detail, Duty Roster

1. Restyle `case-queue-page.component.ts`: status-scoped stat-card row (urgent/open/closed) + roster-scope toggle (`All cases` / `My roster`) as a Material `mat-button-toggle-group` or Tailwind pill toggle matching the demo's `role="tablist"` segmented control; `hpd-data-table` header tinting per status (`bg-[var(--color-warning-row)]` etc., already token-driven — just repoint token values from Phase 0).
2. Restyle `case-detail-page.component.ts` (symptoms/diagnosis/recommendations three-column layout) with Tailwind grid + Material form fields (`mat-form-field` + `textarea matInput` for symptoms/diagnosis, `mat-checkbox` for recommendations) replacing the current plain `<textarea>`/checkbox markup.
3. Restyle `duty-roster-page.component.ts` (roster cards + subscribe/unsubscribe) similarly.
4. Wire Case Queue/Detail to the extended `med-case` contract; wire Duty Roster to the new roster endpoints, once backend-available — until then, both can keep reading from `MockHealthConnectRepository` behind the same interface, so styling work in this phase isn't blocked on backend delivery.

## Phase 5 — App shell (navbar / footer / main)

1. `layouts/navbar/navbar.component.html`: replace `ngbCollapse`/`ngbDropdown` with Material (`mat-toolbar` for the bar, `mat-menu`+`mat-menu-trigger-for` for the Entities/Admin/Language/Account dropdowns, a Material `mat-icon-button` + Tailwind responsive classes for the mobile toggle instead of `navbar-toggler`). Replace all `fa-icon` usages with `<mat-icon>`/Material Icons ligatures. The entity-menu items (currently 14 near-identical `<li>`s) become a single `@for` over an entity-menu config array instead of hand-duplicated markup — reduces the boilerplate the explore pass flagged.
2. `layouts/footer/footer.component.html`: trivial — swap Bootstrap grid utility classes for Tailwind flex/grid, matching `professional-demo.html`'s footer markup almost verbatim (Legal/Management links, copyright, `<jojoaddison/>` mono badge).
3. `layouts/main/main.component.html`: swap `container-fluid` for a Tailwind `max-w-7xl mx-auto` wrapper matching the demo's `<main>` shell.
4. `layouts/profiles/page-ribbon.component.ts`: no change needed (already framework-agnostic).
5. `shared/shared.module.ts`: stop re-exporting `NgbModule` once nothing under `layouts/`/`shared/`/`entities/` needs it (Phase 6 removes the remaining consumers); keep `FontAwesomeModule` only as long as any icon isn't yet ported to Material Icons, then drop it.
6. `shared/alert/*`: replace `<ngb-alert>` with a small Material-styled banner (`mat-icon` + Tailwind alert-style classes) — keep the same `AlertComponent`/`AlertErrorComponent` public API so nothing calling them needs to change.
7. `shared/sort`/`shared/filter`: replace the FontAwesome sort-icon swap in `sort-by.directive.ts` with `<mat-icon>arrow_upward|arrow_downward</mat-icon>`; `filter.component.html` swaps its `fa-icon` similarly. No behavioral change.

## Phase 6 — Entity CRUD screens (14 modules)

Every entity under `entities/professionalService/*` (address, team, task, membership, report, metadata, profile, hc-credential, hc-pay-option, stat, medication, document, activity) plus `entities/patientService/med-case` and `entities/user` follows one JHipster-generated pattern. Fix the pattern once, then mechanically apply it to all 14:

- **List (`<entity>.html`)**: `table table-striped` → Material `mat-table` (or a Tailwind-styled `<table>` reusing `hpd-data-table` from Phase 2/3 if the column/action shape fits — prefer reuse over introducing `mat-table` if `hpd-data-table` already covers sorting/pagination needs); `btn btn-info/primary/danger` → `mat-button`/`mat-icon-button` with Tailwind spacing; keep the existing `hpdSort`/`hpdSortBy` directives (framework-agnostic, no change needed) but swap their FontAwesome-dependent icon rendering per Phase 5 item 7.
- **Update (`<entity>-update.html`)**: `form-control`/`form-label`/`input-group` → `mat-form-field` + `matInput`/`mat-select`; `ngbDatepicker` → Material `mat-datepicker` (`MatDatepickerModule` + `MatNativeDateModule`, replacing the existing `NgbDateDayjsAdapter` in `app.config.ts` with an equivalent Material date adapter wired to dayjs, or the `@angular/material-luxon-adapter`/custom dayjs adapter pattern) — this is the one non-trivial swap since date handling is app.config-level, do it once and verify every date field across all 14 entities still round-trips correctly.
- **Detail (`<entity>-detail.html`)**: `<dl>/<dt>/<dd>` Bootstrap definition-list styling → Tailwind-only (no Material needed here, it's static display).
- **Delete dialog (`<entity>-delete-dialog.html` + `.ts`)**: replace `NgbModal`/`NgbActiveModal` + Bootstrap `.modal-*` markup with `MatDialog` + a shared confirm-dialog component — reuse `shared/health-connect/dialog/confirm-dialog.component.ts` (already Material-based, currently orphaned/unused) and `HealthConnectDialogService` as the one delete-confirmation pattern for all 14 entities instead of 14 near-duplicate dialog components. This finally gives that existing Material dialog a real caller.
- Fix the `hpdTranslate` vs `[jhiTranslate]` mismatch flagged in the inventory while touching each template (either rename every `hpdTranslate` usage to `jhiTranslate`, or add an `hpdTranslate` alias selector to `TranslateDirective` — pick whichever the team prefers; note as an open question below).

Do this entity-by-entity (or via a codemod/script given how mechanical it is) rather than describing each of the 14 individually.

## Phase 7 — Cleanup & verification

1. Remove `bootstrap`, `@ng-bootstrap/ng-bootstrap`, `@popperjs/core`, `@fortawesome/*` from `package.json` once Phase 5/6 confirm zero remaining references (`grep -rn "ngb\|fa-icon\|btn btn-\|class=\"modal-\|form-control\b" src/main/webapp/app` should return nothing outside test fixtures).
2. Remove `content/scss/vendor.scss`'s Bootstrap import and `_bootstrap-variables.scss`; drop the `azure-blue.css` reference (already done in Phase 0).
3. Remove `MockHealthConnectRepository` production usage once real endpoints are live (Phase 1 contracts implemented backend-side) — keep it only as a test double behind `providedIn` overrides in `*.spec.ts`.
4. Re-run `npm run lint`, `npm test`, `npm run prettier:check` after each phase, not just at the end — Bootstrap/ng-bootstrap removal will break `*.spec.ts` files that `TestBed.configureTestingModule` with `NgbModule`, and Material's `NoopAnimationsModule` is usually needed in specs touching new Material components.
5. Manual verification per phase: `npm start`, walk the golden path (login → land on `/dashboard` → stat cards navigate correctly → charts render with real/mock data → open a patient → open a case → duty roster subscribe/unsubscribe) plus at least one entity CRUD create/edit/delete cycle (e.g. `task`) to confirm the Material datepicker + delete-confirm dialog work end-to-end. Check both light/dark OS theme if Material M3 dark mode is enabled (see open question below), and run `npm run e2e` since Cypress specs reference `professionalService`/`patientService` API paths directly and may assert on Bootstrap class names that no longer exist.

## Open questions

1. **Patient & Duty Roster backend entities don't exist yet.** This plan treats their REST contracts (Phase 1) as a spec for a separate backend effort. Should Phase 3/4 Angular work proceed against the mock repository until that backend lands (recommended — unblocks styling work), or should it wait?
2. **Material date adapter:** replacing `ngbDatepicker` app-wide (10 entity templates) requires swapping `NgbDateAdapter`/`NgbDateDayjsAdapter` in `app.config.ts` for a Material-compatible dayjs adapter. Is a community `@angular/material` dayjs adapter acceptable, or should we hand-roll one (there's already a working `NgbDateDayjsAdapter` in `app/config/datepicker-adapter.ts` to use as a reference)?
3. **`hpdTranslate` vs `jhiTranslate` mismatch:** rename usages, or add an alias selector? Affects every entity template touched in Phase 6.
4. **Dark mode:** `professional-demo.html` is light-only. Should the Material M3 theme (Phase 0) define a dark variant too, or stay single-theme for now?
5. **FontAwesome removal timing:** full removal (Phase 7) is only possible once every icon across navbar/entities/shared is confirmed ported to Material Icons — worth a dedicated icon-audit pass before deleting the package.
