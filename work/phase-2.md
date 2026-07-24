# Phase 2 — Dashboard screen migration

**Branch:** `phase-2` (off `phase-1`)

## What changed

### Charting: `ngx-charts` → Chart.js (`ng2-charts`), dashboard only

- Added `ng2-charts@^8.0.0` + `chart.js@^4.5.1` to `package.json` (`ng2-charts@8` is the version that actually supports Angular 19 — v9/v10 require Angular 20/21). Registered `provideCharts(withDefaultRegisterables())` in `app.config.ts`.
- `health-connect/charts/chart-transforms.ts` — replaced `toLineChartSeries`/`toPieChartResults`/`toGroupedBarChartResults` (ngx-charts `{name, value}`/`{name, series}` shapes) with `toLineChartData`/`toDoughnutChartData`/`toGroupedBarChartData` producing Chart.js `ChartData` objects, using the indigo/slate palette from Phase 0 (`#6366f1`, `#818cf8`, `#1b3a57`, …). Rewrote `chart-transforms.spec.ts` to match.
- `health-connect/charts/{line,pie,grouped-bar}-chart.component.ts` — swapped `NgxChartsModule`/`<ngx-charts-*>` for `BaseChartDirective`/`<canvas baseChart [type] [data] [options]>`, matching `professional-demo.html`'s configs (line: filled, tension 0.4, teal border; doughnut: `cutout: '70%'`; bar: grouped, rounded). Kept every existing `@Input` (`titleKey`/`descriptionKey`/`legendKey`/`xAxisKey`/`yAxisKey`) and the `<figure>`/`<figcaption>`/`role="img"` accessible-chart-card wrapper unchanged, now restyled with Tailwind (`rounded-2xl border border-slate-100 bg-white p-6 shadow-sm`) instead of the old `.hpd-chart-card` CSS keyed to the pre-Phase-0 token values.
- `chart-components.spec.ts` needed no changes — it already tested the accessible wrapper shell with the actual chart library imports stripped out via `NO_ERRORS_SCHEMA`, and asserted no stray `<svg>` leaked through; that assertion holds equally well for `<canvas>`.
- **Left `@swimlane/ngx-charts` in place** — still used by `widgets/`, `health-connect/charts`' now-unused import surface elsewhere is zero, but the package itself is still a real dependency for other, non-dashboard consumers per `application-migration.md`'s decision. Not removed.

### `jest.conf.js` fix (needed for the above to even load under Jest)

`ng2-charts` depends on `lodash-es`, which ships ESM (`export` syntax) under a plain `.js` extension — Jest's default `transformIgnorePatterns` (which already special-cased `dayjs/esm`/`d3.*`/`internmap` for the same reason) didn't cover it, so any spec importing a chart component failed with `SyntaxError: Unexpected token 'export'`. Added `lodash-es` to the allowlist.

### Stat cards restyled to match `professional-demo.html`

- `shared/health-connect/stat-card/stat-card.component.ts` — replaced the hand-rolled `.hpd-stat-card*` CSS with the demo's card look: `bg-white rounded-2xl p-5 shadow-sm border border-slate-100`, hover lift (`hover:-translate-y-0.5 hover:shadow-md`), a status badge (rose/indigo/emerald/slate by variant) next to the count, and a decorative bottom accent bar. The demo hardcodes a fixed bar width per status variant rather than deriving one from the count (`urgent: 70%, open: 50%, closed: 90%, default: 30%`) — mirrored that as-is rather than inventing a percentage-of-count metric that doesn't actually exist. Kept the `hpd-focusable` class (asserted by `stat-card.component.spec.ts`) and re-added `hpd-stat-card--selected` as a plain marker class alongside the new Tailwind ring classes (`ring-2 ring-offset-2 ring-indigo-500`), since `case-queue-page.component.spec.ts` queries `.hpd-stat-card--selected` directly as a stable test hook — dropping it broke that (pre-existing, working) test; keeping it costs nothing.
- `shared/health-connect/stat-card/stat-card-row.component.ts` — swapped the `.hpd-stat-grid` CSS class for Tailwind (`grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4`), matching the demo's `grid grid-cols-2 md:grid-cols-4 gap-4`.

### `dashboard-page.component.ts` restyled

Container/spacing converted to Tailwind (`mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8`, chart section `grid grid-cols-1 gap-6 lg:grid-cols-3`), replacing the component's own `styles` block. Kept the existing `<section aria-labelledby>`/`<h2>` structure for screen-reader users (the demo has no visible section headings here, just the stat-card grid) but made the headings `sr-only` rather than deleting them outright — preserves the accessibility grouping without adding visual noise the demo doesn't have.

### Retired the legacy `app/dashboard/` module

- Deleted `src/main/webapp/app/dashboard/` entirely (`dashboard.component.*`, `dashboard.service.*`, `metric-panel/`, `status-panel/` — the Bootstrap + `ngx-charts-number-card` screen with mostly-hardcoded numbers described in `professional-dashboard-migration-plan.md`'s Context section). Confirmed via repo-wide grep that nothing outside that directory referenced it.
- `home.component.ts`/`.html` — removed the dead `DashboardComponent` import and the already-commented-out `<hpd-dashboard>` line (left in place by the pre-migration `63c8a16` commit); the authenticated branch now renders `<hpd-dashboard-page>` directly instead of inside a leftover Bootstrap `row/col-md-10` wrapper (redundant now that the page itself is `max-w-7xl mx-auto`).

## Verification

- `npx tsc -p tsconfig.app.json --noEmit` — clean.
- `npx eslint` over every changed file — clean.
- `npx prettier --write` over every changed file — applied (formatting only).
- `npx ng build --configuration development` and `--configuration production` — both succeed, no errors, no budget warnings (chart.js's addition didn't push any bundle over the configured 500kb/1mb budgets).
- `npx ng test --test-path-pattern="health-connect/|shared/health-connect/|home.component"` — **283/284 pass**. The one failure (`health-connect.routes.spec.ts`) is the same pre-existing stale authorities assertion documented in `work/phase-1.md`, unrelated to this phase. The 7 always-failing `med-case/**` suites (pre-existing `vitest` import bug, also documented in Phase 1) are unaffected either way.
- Manually re-verified `dashboard-page.component.spec.ts` and `case-queue-page.component.spec.ts` individually (the two specs most likely to regress from the stat-card/chart rework) — both pass.

## Deferred to later phases

- Wiring the dashboard's chart series to the real `DashboardApiService` endpoints from Phase 1 — still reads `repository.charts()`, which resolves through whichever `HEALTH_CONNECT_REPOSITORY` provider is active (currently `MockHealthConnectRepository`); no code change needed here when a backend eventually lands and the DI override flips.
- Patients/Cases/Duty-Roster page restyles — Phases 3 and 4.
- Removing `@swimlane/ngx-charts` — not attempted; still a real dependency for `widgets/` and other non-dashboard consumers, out of this migration's scope per `application-migration.md`.
