# Phase 3 — Patient Directory & Patient Record

**Branch:** `phase-3` (off `phase-2`)

## What changed

Restyled every screen and shared primitive behind the Patients feature to Tailwind + Material Icons, matching `professional-demo.html`. Because `hpd-data-table`, `hpd-pagination`, `hpd-async-state`, and `hpd-search-input` (`shared/health-connect/*`) are reused by the Case Queue in Phase 4, doing this work here means Phase 4 inherits it for free.

- **`shared/health-connect/data-table/data-table.component.ts`** — Tailwind table (`overflow-x-auto rounded-lg border`, `divide-y`, hover row tint), `<mat-icon>` action buttons and empty-state illustration instead of raw emoji/text. Per `professional-demo.html`'s `renderDataTable`, only the header row tints by status (`bg-hpd-row-urgent/open/closed`, wired through the Phase 0 Tailwind tokens) — rows stay plain white/hover-slate. Kept `hpd-data-table__header--<variant>` / `hpd-data-table--<variant>` / `.hpd-data-table__actions` as inert marker classes alongside the new Tailwind classes, since both this component's own spec and `case-queue-page.component.spec.ts` (Phase 4 territory) assert on them directly as stable hooks — dropping them would have broken a passing, legitimate test for no visual gain.
- **`shared/health-connect/data-table/pagination.component.ts`** — Tailwind pill pagination; kept `page-item`/`page-link` marker classes for the same reason (`pagination.component.spec.ts` queries `li.page-item button` directly).
- **`shared/health-connect/async-state/async-state.component.ts`** — Tailwind empty/error states with `<mat-icon>` illustrations (`error_outline`, `inbox`) and a restyled retry button.
- **`shared/health-connect/form-controls/search-input.component.ts`** — Tailwind input with a `<mat-icon>search</mat-icon>` affordance, matching the demo's search box.
- **`shared/health-connect/form-controls/file-upload-trigger.component.ts`** — Tailwind pill button with `<mat-icon>cloud_upload</mat-icon>`; hidden `<input type="file">` switched from Bootstrap's `visually-hidden` to Tailwind's `sr-only` (equivalent, just consistent with everything else touched this phase).
- **`health-connect/pages/patient-directory-page.component.ts`** — card-wrapped page (`rounded-2xl border bg-white shadow-sm`) with the gender/children-only filters and search box laid out in a single header row, matching the demo's directory toolbar. Swapped the view-row action's emoji icon (`👁`) for the Material icon name `visibility`.
- **`health-connect/pages/patient-record-page.component.ts`** — identity panel with an avatar circle, and the five record panels (Cases/Visitations/Activity/Medications/Reports) as a `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3` of white cards with `<mat-icon>` headings (`folder_shared`, `event`, `timeline`, `medication`, `summarize`), matching the demo's patient-detail modal grid. Kept `hpd-panel`/`hpd-record-grid` marker classes (asserted by `patient-record-page.component.spec.ts`) alongside the new Tailwind grid/card classes.
- **`health-connect/pages/route-driven-overlay-host.component.ts`** — restyled as the modal surface the demo uses for Patient Record/Case Detail: backdrop blur, `rounded-2xl` card, header with Print/Close pill buttons (`<mat-icon>print</mat-icon>`/`<mat-icon>close</mat-icon>`). Kept the existing route-driven, URL-addressable overlay pattern and its focus-trap/ARIA implementation entirely as-is — only the visual layer changed, per the Phase 3 plan's call to restyle rather than replace it with `MatDialog`.
- **`health-connect/pages/activity-log-dialog.component.ts`** — same modal restyle treatment (backdrop, white card, labelled form fields, pill Save/Cancel buttons).

## Verification

- `npx tsc -p tsconfig.app.json --noEmit` — clean.
- `npx eslint` over every changed file — clean.
- `npx prettier --write` over every changed file — applied (formatting only).
- `npx ng build --configuration production` — succeeds, no errors, no budget warnings.
- `npx ng test --test-path-pattern="health-connect/|shared/health-connect/"` — **283/284 pass**, identical to the Phase 2 baseline (same one pre-existing stale-authorities failure in `health-connect.routes.spec.ts`, same 8 pre-existing `vitest`-import failures in `entities/patientService/med-case/**`, neither touched or newly broken by this phase).
- Individually re-ran every spec for every file touched this phase (`data-table`, `pagination`, `async-state`, `patient-directory-page`, `patient-record-page`, `route-driven-overlay-host`, `activity-log-dialog`) — all pass, confirming the class-name-preservation approach worked (no cross-component test breakage this time, unlike the stat-card lesson from Phase 2).

## Deferred to later phases

- Case Queue / Case Detail / Duty Roster restyle — Phase 4, now able to reuse the shared `hpd-data-table`/`hpd-pagination`/`hpd-async-state` restyling done here.
- Wiring `PatientApiService`/patient endpoints from Phase 1 into `MockHealthConnectRepository`'s replacement — still blocked on a real backend; `filterPatients`/`findPatient` continue to resolve through whichever `HEALTH_CONNECT_REPOSITORY` provider is active.
