# Phase 1 — Data contracts & repository layer

**Branch:** `phase-1` (off `phase-0`)

## What changed

### REST contracts as TypeScript types + services (`src/main/webapp/app/health-connect/api/`, new)

- `dashboard-api.model.ts` / `dashboard-api.service.ts` — `DashboardSummaryDto`, `CaseTimelinePointDto`, `CaseDistributionSegmentDto`, `PatientGroupSeriesDto`; `DashboardApiService` calling `GET services/patientService/api/dashboard/{summary,case-timeline,case-distribution,case-by-patient-group}`.
- `patient-api.model.ts` / `patient-api.service.ts` — `PatientListItemDto`, `PatientRecordDto` (+ nested case/visitation/activity/medication/report DTOs), `CreateActivityDto`/`CreateReportDto`; `PatientApiService` calling `GET services/patientService/api/patients` (paged the JHipster way — `createRequestOption` + `X-Total-Count` header, matching `med-case.service.ts`'s convention rather than a Spring Data `Page` envelope), `GET .../patients/:id`, and two endpoints added beyond the original plan doc so `appendActivity`/`appendReport` have somewhere real to post to: `POST .../patients/:id/activities` and `POST .../patients/:id/reports`.
- `duty-roster-api.model.ts` / `duty-roster-api.service.ts` — `DutyRosterDto`; `DutyRosterApiService` calling `GET services/professionalService/api/duty-rosters` and `POST`/`DELETE .../duty-rosters/:id/subscription`.

**Correction vs. the original plan doc:** `professional-dashboard-migration-plan.md` specced `GET services/patientService/api/med-cases`, but the existing `MedCaseService` (untouched here) actually calls plain `api/med-cases` — no `patientService` microservice segment, i.e. it's routed through the gateway directly, not a microservice-namespaced path. Kept that as-is rather than changing existing, working behavior; `http-health-connect.repository.spec.ts` asserts the real URL.

### `entities/patientService/med-case/med-case.model.ts` — extended `IMedCase`

Added optional fields the backend doesn't support yet, each commented as such: `patientId`, `status: MedCaseStatus` (`'urgent'|'open'|'closed'`), `assignedRosterId`, `brief`. All optional so nothing about the existing generated CRUD screens (list/update/detail/delete, restyled in Phase 6) or `MedCaseService` breaks — `MedCaseService.query()`/`partialUpdate()` already forward arbitrary fields, so no service-layer change was needed there.

### `http-health-connect.repository.ts` (new) — `HttpHealthConnectRepository`

A real `HttpClient`-backed implementation of the existing `HealthConnectRepository` interface, built against the contracts above. **Not wired in** — `HEALTH_CONNECT_REPOSITORY`'s factory in `health-connect.repository.ts` still resolves to `MockHealthConnectRepository`, with a comment showing the one-line DI override (`{ provide: HEALTH_CONNECT_REPOSITORY, useClass: HttpHealthConnectRepository }`) for whenever a backend exists.

Architectural note worth flagging explicitly: `HealthConnectRepository` is a synchronous, signal-based interface (mirroring the in-memory mock), but real data must be fetched asynchronously. This implementation uses a **read-through-cache** pattern:
- Eagerly loaded on construction: patient list, case queue (from `MedCaseService.query()`), duty rosters, and the three dashboard chart series + summary.
- Lazily loaded: `findPatient(id)` returns `undefined` on a cache miss and fires the `GET /patients/:id` request in the background; once it resolves, an internal signal updates, so any `computed()` that already called `findPatient` (e.g. `patient-record-page.component.ts`'s `record` computed) re-evaluates automatically — the same reactivity the mock gets from reading a signal internally.
- Mutating methods (`updateCase`, `appendActivity`, `appendReport`, roster subscribe/unsubscribe) apply the change to the local cache immediately (optimistic) and fire the real HTTP call alongside; `archiveCase` stays client-side-only, matching the mock's own (non-persisted) behavior — no archive endpoint was specced since the original plan didn't call for one either.
- `updateCase` maps `ClinicalCase.recommendationIds: string[]` onto `IMedCase.recommendations: string` (still a single free-text field on the backend) by joining with commas — a lossy interim mapping, called out in a code comment, until the backend gets a structured recommendations column.
- `professionalIdForAccount`/`shiftLabelForAccount` return `null` over HTTP: no professional-directory endpoint was specced in Phase 1 (the mock resolves these from a static fixture). Flagged as a follow-up rather than silently faked.

## Verification

- `npx tsc -p tsconfig.app.json --noEmit` — clean.
- `npx eslint` over every new/changed file — clean.
- `npx prettier --write` over every new/changed file — applied (formatting only).
- `npx ng build --configuration development` — succeeds, no errors.
- New tests, run via `npx ng test --test-path-pattern=<pattern>` (see note below): `dashboard-api.service.spec.ts`, `patient-api.service.spec.ts`, `duty-roster-api.service.spec.ts` (URL/method/param assertions via `HttpTestingController`), and `http-health-connect.repository.spec.ts` (construction fetch behavior, lazy `findPatient`, optimistic `updateCase` + real PATCH body assertion) — **14/14 pass**.
- Confirmed pre-existing `health-connect.repository.spec.ts`, `health-connect.models.spec.ts`, `authority-role.spec.ts`, `authority-role.guard.spec.ts` still pass unaffected by the `IMedCase` model extension.

**Test-runner note (useful for every later phase):** this project's actual test command is `npx ng test --test-path-pattern="<regex>"` (the `@angular-builders/jest:run` builder, which layers `jest-preset-angular`'s TS/Angular transform on top of `jest.conf.js`). Invoking `npx jest --config jest.conf.js <path>` directly — as `CLAUDE.md` suggests — skips that layering and fails every file with a bogus "Missing initializer" parse error; that is a false alarm from bypassing the builder, not a real repo issue. `--include=` (documented in `CLAUDE.md` for `ng test`) is also not a valid flag for this builder; `--test-path-pattern` (or `--testPathPattern`, converted by the CLI) is what actually works.

**Pre-existing issues discovered, not introduced by this phase, not fixed here (out of scope):**
- All 7 spec files under `entities/patientService/med-case/**` import `describe`/`it`/`expect`/etc. from `'vitest'`, which isn't installed — every one fails to even parse. Likely a JHipster blueprint mismatch from when `med-case` was generated. Flagged for Phase 6, which touches this module anyway; the fix is a one-line deletion of that import per file (every other spec in the repo relies on Jest's global types instead).
- `health-connect.routes.spec.ts` asserts `route.data.authorities` equals `[Authority.USER]`, but commit `63c8a16` (before this migration started) widened the real route data to all eight authorities. Stale assertion, unrelated to Phase 1's changes.

## Deferred to later phases

- Actually swapping `HEALTH_CONNECT_REPOSITORY` to `HttpHealthConnectRepository` — blocked on a real backend implementing these contracts; not this repo's job per `CLAUDE.md`.
- Consuming the dashboard chart contracts inside `DashboardPageComponent` — Phase 2, alongside the Chart.js swap.
- Fixing the `vitest` imports in `med-case` specs — Phase 6.
