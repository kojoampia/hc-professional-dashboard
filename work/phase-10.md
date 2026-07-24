# Phase 10 — Dashboard chart layout: one per row, capped at 600px

**Branch:** `phase-10` (off `phase-9`)

## Context

The health-connect dashboard (`health-connect/pages/dashboard-page.component.ts`) rendered its three charts (case timeline line chart, case distribution pie chart, cases-by-patient grouped bar chart) side by side in a 3-column grid on wide viewports (`grid grid-cols-1 gap-6 lg:grid-cols-3`), with each chart stretching to fill the row's height (`h-full` on the chart `<figure>`). Asked to rearrange so each chart takes its own row with a maximum height of 600px.

## Changes

- `dashboard-page.component.ts` — dropped `lg:grid-cols-3` from the charts `<section>`, leaving `grid grid-cols-1 gap-6`, so the three charts always stack one per row regardless of viewport width.
- `charts/line-chart.component.ts`, `charts/pie-chart.component.ts`, `charts/grouped-bar-chart.component.ts` — each chart's outer `<figure>` changed from `h-full` (stretch to fill the grid row, which only made sense in the old 3-column layout) to `h-[600px] max-h-[600px]` (a fixed, capped height). All three components are used exclusively by the dashboard page, so this is a safe, non-breaking change scoped to this one screen.

No other layout classes changed — the chart card styling (rounded corners, border, padding, title/description) and the internal Chart.js `maintainAspectRatio: false` options were already height-agnostic, so the canvas fills whatever height the new fixed-height figure gives it.

## Verification

- `npx tsc -p tsconfig.app.json --noEmit` — clean.
- `npx ng build --configuration development` — clean, no new warnings.
- `npx ng test` — full suite, 75/75 suites, 315/315 tests passing (including `chart-components.spec.ts` and `dashboard-page.component.spec.ts`, neither of which assert on the changed classes).
- `npm run lint` — clean.
- `npx prettier --check` — clean on all four touched files.
