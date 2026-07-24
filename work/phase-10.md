# Phase 10 — Dashboard chart layout and axis formatting fixes

**Branch:** `phase-10` (off `phase-9`)

## Part 1 — Chart layout: one per row, capped at 600px

### Context

The health-connect dashboard (`health-connect/pages/dashboard-page.component.ts`) rendered its three charts (case timeline line chart, case distribution pie chart, cases-by-patient grouped bar chart) side by side in a 3-column grid on wide viewports (`grid grid-cols-1 gap-6 lg:grid-cols-3`), with each chart stretching to fill the row's height (`h-full` on the chart `<figure>`). Asked to rearrange so each chart takes its own row with a maximum height of 600px.

### Changes

- `dashboard-page.component.ts` — dropped `lg:grid-cols-3` from the charts `<section>`, leaving `grid grid-cols-1 gap-6`, so the three charts always stack one per row regardless of viewport width.
- `charts/line-chart.component.ts`, `charts/pie-chart.component.ts`, `charts/grouped-bar-chart.component.ts` — each chart's outer `<figure>` changed from `h-full` (stretch to fill the grid row, which only made sense in the old 3-column layout) to `h-[600px] max-h-[600px]` (a fixed, capped height). All three components are used exclusively by the dashboard page, so this is a safe, non-breaking change scoped to this one screen.

No other layout classes changed — the chart card styling (rounded corners, border, padding, title/description) and the internal Chart.js `maintainAspectRatio: false` options were already height-agnostic, so the canvas fills whatever height the new fixed-height figure gives it.

## Part 2 — "Cases by Patient": integer-only y-axis ticks

### Context

The "Cases by Patient" chart (`charts/grouped-bar-chart.component.ts`) plots case counts per patient on its y-axis (`healthConnect.dashboard.charts.caseCount` → "Number of cases"). Chart.js's linear scale auto-selects a tick step based on the data's max value and the available axis height; with a small max value (e.g. 2 or 3 cases) it was picking fractional steps (0.5, 1.5, 2.5, ...), showing decimal values on an axis that only ever represents whole case counts.

### Change

- `charts/grouped-bar-chart.component.ts` — added `ticks: { precision: 0 }` to the y-scale's config alongside the existing `beginAtZero: true`. `precision: 0` is Chart.js's linear-scale option for rounding auto-generated tick values to whole numbers, so the axis now only ever shows integers regardless of the data's max value.

Scoped to this one chart only, since it's the one named in the request; the line chart's y-axis uses the same `caseCount` label but wasn't reported as showing decimals and was left untouched.

## Verification

- `npx tsc -p tsconfig.app.json --noEmit` — clean.
- `npx ng build --configuration development` — clean, no new warnings.
- `npx ng test` — full suite, 75/75 suites, 315/315 tests passing across both changes (including `chart-components.spec.ts` and `dashboard-page.component.spec.ts`, neither of which assert on the changed classes/options).
- `npm run lint` — clean.
- `npx prettier --check` — clean on all touched files.
