# Phase 4 — Case Queue, Case Detail, Duty Roster

**Branch:** `phase-4` (off `phase-3`)

## What changed

- **`health-connect/pages/case-queue-page.component.ts`** — page wrapped in a `rounded-2xl border bg-white shadow-sm` card (matching the Patient Directory treatment from Phase 3); the "All cases"/"My roster" toggle restyled as a Tailwind segmented control (`role="tablist"`, active tab gets `bg-white shadow`) instead of two separate outline buttons, matching `professional-demo.html`'s roster-scope pill. Row action icons switched from an emoji (`👁`) and icon-less buttons to Material icon names (`visibility`, `restart_alt`, `archive`). Reused `hpd-data-table`/`hpd-stat-card-row`/`hpd-async-state` from Phases 2–3 as-is.
- **`health-connect/pages/case-detail-page.component.ts`** — Symptoms/Diagnosis/Recommendations now a `grid grid-cols-1 md:grid-cols-3 gap-6` of white cards with `<mat-icon>` headings (`sick`, `medical_services`, `fact_check`), matching the demo's case-detail modal layout exactly. Print/Cancel/Save actions restyled as pill buttons with icons (`print`, `save`), Save using the primary indigo color.
- **`shared/health-connect/form-controls/checkbox-list.component.ts`** — Tailwind checkbox list (`accent-hpd-primary`, hover state on the label), used by the Recommendations panel above.
- **`health-connect/pages/duty-roster-page.component.ts`** — roster cards restyled as `rounded-xl border` panels (highlighted with a subtle indigo tint when subscribed, matching the demo's `border-primary-blue/40 bg-primary-blue/5` pattern), each shift shown with a colored status pill (emerald/indigo/slate for active/upcoming/completed) instead of plain text, subscribe/unsubscribe as a pill button. Added a subtitle line under the page heading (`healthConnect.roster.subtitle`, new translation key added to `en`/`fr`/`de`) explaining what subscribing does, matching the demo's copy.

No structural or behavioral changes in this phase — every component's public `@Input`/`@Output` contract, routing, and repository interaction is untouched; only templates/styling changed.

## Verification

- `npx tsc -p tsconfig.app.json --noEmit` — clean.
- `npx eslint` over every changed file — clean.
- `npx prettier --write` over every changed file (including the three `healthConnect.json` locale files) — applied (formatting only; validated all three are still parseable JSON before running prettier).
- `npx ng build --configuration production` — succeeds, no errors, no budget warnings.
- `npx ng test --test-path-pattern="health-connect/|shared/health-connect/"` — **283/284 pass**, identical baseline to Phases 2–3 (same pre-existing `health-connect.routes.spec.ts` + 8 `med-case` `vitest`-import failures, none newly broken).
- Individually re-ran `case-queue-page`, `case-detail-page`, and `duty-roster-page` specs — all pass, including the two assertions (`.hpd-stat-card--selected`, `.hpd-data-table__header--closed`) that depend on marker classes preserved back in Phase 2/3.

## Deferred to later phases

- App shell (navbar/footer/main) restyle — Phase 5.
- `med-case` entity CRUD restyle — Phase 6.
- Wiring Case Queue/Duty Roster to the real `MedCaseService`/`DutyRosterApiService` contracts from Phase 1 — still blocked on backend support for the extended `med-case` fields and the new roster entities.
