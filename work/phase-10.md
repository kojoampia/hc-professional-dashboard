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

## Part 3 — "Case Distribution": status-specific slice colors

### Context

The "Case Distribution" doughnut chart (`charts/pie-chart.component.ts`, data built by `chart-transforms.ts`'s `toDoughnutChartData`) colored its three slices (urgent/open/closed case counts) by picking sequentially from a generic indigo/slate `CHART_PALETTE` by array index, with no relationship between a slice's color and what it represents. Asked to use fixed, meaningful colors instead.

The first pass used a literal orange/amber/green reading of the request. A follow-up request asked for conformity instead: reuse the exact colors the case-status stat cards above the chart already use for these same three variants (`shared/health-connect/stat-card/stat-card.component.ts`'s `BADGE_CLASSES`/`BAR_CLASSES`), so the doughnut slices visually agree with the stat cards rather than introducing a second, different color language for the same three statuses.

### Change

- `charts/chart-transforms.ts` — added a `CASE_STATUS_COLORS` lookup and changed `toDoughnutChartData`'s `backgroundColor` mapping to look up each segment's color by its `label` field (always `'urgent'`/`'open'`/`'closed'` — see `health-connect.repository.ts`'s `charts()` computed and the `CaseDistributionSegmentDto` contract in `api/dashboard-api.model.ts`) instead of by array position. Falls back to the original `CHART_PALETTE`-by-index behavior for any unrecognized label, so this doesn't break if the backend ever adds a status this chart doesn't know about.
  - Final colors, matched to `StatCardComponent`'s `BADGE_CLASSES`/`BAR_CLASSES` for the same variants (Tailwind's `rose-500`/`indigo-500`/`emerald-500`, the exact hex values Tailwind resolves those utility classes to):
    - `urgent`: `#f43f5e` (rose-500 — was briefly orange `#f97316` in the first pass, replaced for stat-card conformity)
    - `open`: `#6366f1` (indigo-500 — was briefly amber `#f59e0b`)
    - `closed`: `#10b981` (emerald-500 — was briefly green `#22c55e`)
- `charts/chart-transforms.spec.ts` — updated the `toDoughnutChartData` test to cover all three known statuses and their (now stat-card-matching) colors, plus a case asserting the palette fallback for an unknown label.

This only affects `toDoughnutChartData`/the case-distribution pie chart — `toGroupedBarChartData` (used by "Cases by Patient") still colors its series from the generic `CHART_PALETTE`, since that chart's series are per-patient groupings ("new"/"returning"), not case statuses, and weren't part of either request.

## Verification

- `npx tsc -p tsconfig.app.json --noEmit` — clean.
- `npx ng build --configuration development` — clean, no new warnings.
- `npx ng test` — full suite, 75/75 suites, 315/315 tests passing across all three changes (including `chart-components.spec.ts`, `chart-transforms.spec.ts`, and `dashboard-page.component.spec.ts`).
- `npm run lint` — clean.
- `npx prettier --check` — clean on all touched files.
