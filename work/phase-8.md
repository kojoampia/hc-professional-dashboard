# Phase 8 — `.jhipster/*.json` entity definitions for the health-connect domain

**Branch:** `phase-8` (off `phase-7`)

## Context

`health-connect.models.ts` (the mock-backed domain model behind the Dashboard/Patients/Cases/Duty-Roster feature — see `application-migration.md` and `work/phase-1.md`) has never had a corresponding JHipster entity definition, unlike the older `professionalService`/`patientService` entities under `.jhipster/*.json` (`Address.json`, `Task.json`, `MedCase.json`, etc. — the declarative specs JHipster's generator reads to scaffold/regenerate an entity's backend + client code). This phase adds one `.jhipster/<Model>.json` file per concrete domain model in `health-connect.models.ts`, following the exact structure of the existing files (`MedCase.json`/`Patient.json` specifically, as the closest in style/vintage), so the health-connect domain is representable the same way the rest of the app's entities are.

## What counted as a "model"

Went through every exported type in `health-connect.models.ts` and kept only the concrete, nameable domain nouns — the same kind of thing every existing `.jhipster/*.json` file represents. Excluded on purpose: `ShiftLabel`, `PageRequest`/`Page<T>`, the chart types (`LineChartPoint`/`PieChartSegment`/`GroupedBar`/`GroupedBarChartGroup`/`ChartData`), and the view-state types (`AsyncViewState`/`PatientDirectoryViewState`/`CaseQueueViewState`) — all UI/DTO-shaped helper types, not persisted domain entities. `CaseQueueRow` and `PatientRecord` were also excluded: the former is a projection of `ClinicalCase` (same entity, different view), the latter is a composition of the other entities (a patient plus its cases/visitations/activities/medications/reports), not a separate persisted thing.

## Files created / updated

| File | Status | Notes |
|---|---|---|
| `Patient.json` | **Rewritten** | The existing file was wrong — internally it still had `"name": "Profile"` and Profile's old field set (firstName/middleNames/lastName/mobilePhone/rosterId/teamId/...), an apparent stale copy-paste that never actually described a Patient. Replaced with the real fields from `PatientListRow & PatientIdentity`: `id, patientName, lastActivityAt, sex, isChild, dateOfBirth, phone, email, emergencyContactName, emergencyContactPhone, avatarUrl` (the nested `EmergencyContact { name, phone }` object flattened to two scalar fields, matching how every other field in these files is a flat scalar — no existing entity in `.jhipster/` nests an object). `microserviceName`/`clientRootFolder` set to `patientService`, matching the `GET services/patientService/api/patients` contract from `work/phase-1.md`. |
| `MedCase.json` | **Updated** | Added the four fields Phase 1/6 already added to the real `IMedCase` TypeScript model but that were never reflected back into the entity spec: `patientId`, `status`, `assignedRosterId`, `brief`. Appended at the end of the `fields` array; everything else (metadata, existing 7 fields, `changelogDate`) left untouched. |
| `DutyRoster.json` | New | `id, name, subscribedProfessionalIds`. `microserviceName: professionalService`. |
| `DutyShift.json` | New | `id, rosterId, professionalId, startsAt, endsAt, status`. `microserviceName: professionalService`. |
| `HealthConnectProfessional.json` | New | `id, accountLogin, name, role, dutyRosterIds`. `microserviceName: professionalService`. |
| `Recommendation.json` | New | `id, label, category`. `microserviceName: patientService` (used by case management; no backend endpoint specced yet per Phase 1 — this is the spec for when one exists). |
| `Visitation.json` | New | `id, patientId, occurredAt, label` — health-connect's plain `RecordEntry` shape, used as-is (no extension) for patient visitations. `microserviceName: patientService`. |
| `MedicationRecord.json` | New | Same `RecordEntry` shape (`id, patientId, occurredAt, label`), for patient medication log entries. **Named `MedicationRecord`, not `Medication`** — `Medication.json` already exists for an unrelated, differently-shaped `professionalService` entity (`name, description, prescription`), and overwriting it would have destroyed a real (if currently orphaned) entity definition unrelated to this work. |
| `ActivityLogEntry.json` | New | `id, patientId, occurredAt, label, title, description, createdAt` — matches the TS interface name and fields exactly (`RecordEntry` + `title`/`description`/`createdAt`). **Named after the exact TS type, not `Activity`** — same reasoning as `MedicationRecord`: `Activity.json` already exists for a different, differently-shaped `professionalService` entity. |
| `ClinicalReport.json` | New | `id, patientId, occurredAt, label, reportType, url` — matches `ClinicalReport`'s TS fields exactly (`RecordEntry` + `reportType`/`url`). **Named after the exact TS type, not `Report`** — same collision-avoidance reasoning; `Report.json` is a different, unrelated `professionalService` entity. |

`ClinicalCase` (the TS name for what the backend actually calls `MedCase`) intentionally has no separate file — it's the same entity `MedCase.json` already describes (Phase 1/6 already established the field-name mapping between `ClinicalCase.symptoms/diagnosis/recommendationIds` and `IMedCase.symptoms/diagnoses/recommendations`), so it was updated rather than duplicated under a second name.

## Conventions followed (matching the existing files, not introduced)

- Every field is a flat scalar (`String`/`Instant`/`LocalDate`/`Boolean`) — no existing `.jhipster/*.json` file in this repo uses relationships (`"relationships": []` in all of them, including ones with clear conceptual FK-like fields such as `Task.attendantId`/`teamId`/`patientId`), so array/list-shaped concerns (`subscribedProfessionalIds`, `dutyRosterIds`) are modeled the same way this codebase already models them elsewhere — a single `String` field — rather than introducing JHipster relationship objects nothing else here uses.
- `dto: "no"`, `readOnly: false`, `searchEngine: "no"`, `service: "serviceClass"` on every new file, matching `MedCase.json`/`Patient.json` (the two most recent, most directly comparable existing examples) rather than the older Bootstrap-era entities' conventions (some of which have `searchEngine: true` as a raw JSON boolean instead of the string `"no"`/`"yes"` — an inconsistency in the older files, not replicated here).
- `changelogDate`s are unique, ascending `yyyyMMddHHmmss` timestamps dated today, one minute apart, so they sort predictably if JHipster ever regenerates a Liquibase changelog from them.
- `.yo-rc.json`'s `generator-jhipster.entities` array — the master registry JHipster itself keeps in sync with `.jhipster/*.json` — updated to list all eight new entities (`Patient`/`MedCase` were already listed).

## What was deliberately not touched

- The other nine pre-existing `.jhipster/*.json` files for entities under `entities/professionalService/*` that were deleted from the Angular app in the pre-migration `63c8a16` cleanup (`Address`, `Team`, `Task`, `Metadata`, `Document`, `Stat`, `Report`, `Medication`, `Activity`, `Profile`) — this task was scoped to health-connect models specifically, not a `.jhipster/` cleanup pass. They stay as orphaned-but-untouched entity specs, same as before this phase.
- `MedCase.json`'s existing `microserviceName`/`clientRootFolder` value of `hcPatientService` — inconsistent with the real Angular folder (`entities/patientService/med-case`, i.e. `patientService`) and with every new file added this phase (which correctly use `patientService`), but fixing a pre-existing field unrelated to the requested field additions was out of scope here; flagging it for whoever next touches this file.

## Verification

- All ten touched/created JSON files (plus `.yo-rc.json`) parse as valid JSON (`python3 -c "import json; json.load(...)"` on each).
- `npm run lint` — clean (these are data files, not linted directly, but confirms nothing else in the repo broke).
- `npx prettier --check ".jhipster/*.json" ".yo-rc.json"` — clean, all files already match this project's Prettier formatting.
- `npx ng test` (full suite) — still 327/327 passing, 78/78 suites — these files aren't consumed by the Angular build/runtime at all (they're JHipster generator metadata only), so this just confirms nothing was inadvertently broken.
