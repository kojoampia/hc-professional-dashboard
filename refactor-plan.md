# web/ refactor plan — JDL for the health-connect models, then a JHipster-shaped entity layer

**Status: approved, implementing. Revision 3 — all five decisions resolved in § 5.**

## Decisions taken

- **Reading B.** Make `entities/` look exactly like generated JHipster output, and keep the
  hand-built `health-connect/` app as the primary UI. Reading C (literal repo-wide conformance,
  which deletes the application) is ruled out.
- **`ClinicalCase` replaces `MedCase` entirely.** `MedCase` is discarded, not migrated.

Everything below follows from those two.

---

## 1. Why discarding MedCase is the right call, and what it costs

`MedCase` is the only entity in the app today with generated code, a route, and passing tests. It is
also the source of the worst contract in the codebase. `http-health-connect.repository.ts` exists
purely to translate between the two shapes:

```ts
// today: ClinicalCase.recommendationIds: string[] round-tripped through a free-text column
recommendations: changes.recommendationIds ? changes.recommendationIds.join(',') : existing.recommendations;
recommendationIds: medCase.recommendations ? medCase.recommendations.split(',').filter(Boolean) : [];
```

Adopting `ClinicalCase` as the entity **deletes that translation layer outright** — `toClinicalCase`,
`toCaseQueueRow`, the `IMedCase` cache, and the comma-join/split both disappear. That is the main
prize here, and it is worth more than the 43 tests being retired.

### What has to change when MedCase goes

| Location                                                    | Change                                                                       |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `entities/patientService/med-case/`                         | Delete — 21 files, 7 spec suites, **43 tests**                               |
| `entities/entity.routes.ts`                                 | Its only route (`med-case`) replaced by `clinical-case`                      |
| `layouts/sidebar/shell-navigation.ts`                       | Nav item `/med-case` → `/clinical-case`, and its i18n key                    |
| `health-connect/http-health-connect.repository.ts` (+ spec) | Drop the `MedCaseService`/`IMedCase` imports, the cache, and both converters |
| `health-connect/api/patient-api.service.ts`                 | Comment reference only                                                       |
| `i18n/{en,es}/hcPatientServiceMedCase.json`                 | Delete (note: `fr`/`de` were never written — already incomplete)             |
| `.jhipster/MedCase.json`, `.yo-rc.json`                     | Remove; add `ClinicalCase`                                                   |
| `src/test/javascript/cypress/e2e/entity/med-case.cy.ts`     | Delete                                                                       |

**Test arithmetic:** 385 → 342 on removal, then back up by roughly 43 as `ClinicalCase` generates its
own 7 suites. Any phase that ends below ~342 means something unintended broke.

**Endpoint reality, unchanged by this:** `MedCaseService` calls plain `api/med-cases`; a generated
`ClinicalCase` owned by `patientService` will call `/services/patientService/api/clinical-cases`.
**Neither endpoint exists on any backend in this workspace.** The HTTP repository is inactive
(`MockHealthConnectRepository` is the live provider), so this stays a frontend-only contract until a
backend implements it. Renaming the entity does not create an API.

## 2. Part 1 — model the health-connect domain properly in JDL

The JDL already on disk (`professional-dashboard.jdl`, validated) was mechanically exported from the
existing definitions. It is syntactically valid but **not yet an honest model**, because the
definitions flatten things JDL can express properly. Fixing that is the real Part 1 work.

### 2a. Three `string[]` fields are currently flattened to `String`

JDL has no array field type; lists are relationships. All three are lying today:

| Model field (TS)                                    | Definition today                   | Proposed JDL                                                                  |
| --------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| `ClinicalCase.recommendationIds: string[]`          | `recommendations String`           | `ManyToMany ClinicalCase{recommendations} to Recommendation`                  |
| `DutyRoster.subscribedProfessionalIds: string[]`    | `subscribedProfessionalIds String` | `ManyToMany DutyRoster{subscribedProfessionals} to HealthConnectProfessional` |
| `HealthConnectProfessional.dutyRosterIds: string[]` | `dutyRosterIds String`             | inverse side of the above                                                     |

`Recommendation`, `HealthConnectProfessional` and `DutyRoster` are all already entities, so these
relationships are expressible with no new modelling. **This is what makes the JDL genuinely
JHipster-shaped rather than a flat transcription.** It does change the wire format — related objects
instead of id arrays — which is a real API decision (§ 5, question 1).

### 2b. Four union types should be real JDL enums

Currently all `String`:

| TS type           | Values                        | Used by                          |
| ----------------- | ----------------------------- | -------------------------------- |
| `CaseStatus`      | `urgent, open, closed`        | `ClinicalCase.status`            |
| `DutyShiftStatus` | `upcoming, active, completed` | `DutyShift.status`               |
| `PatientSex`      | `female, male, unspecified`   | `Patient.sex`                    |
| `AuthorityRole`   | the nine clinical roles       | `HealthConnectProfessional.role` |

`AuthorityRole` is the cross-repo invariant already declared in three places; adding it as a JDL enum
gives it a fourth definition, so it must be generated from, not alongside, `authority.constants.ts`.

### 2c. Id-reference fields

`patientId`, `assignedProfessionalId`, `assignedRosterId`, `DutyShift.rosterId/professionalId`,
`ActivityLogEntry.patientId` and friends are plain strings acting as foreign keys. Idiomatic JHipster
would make these `ManyToOne` relationships. **I propose leaving them as strings** — converting them
touches every screen's data flow for no functional gain, and MongoDB documents legitimately hold id
references. Flagging it so the choice is explicit rather than an oversight.

### 2d. Resulting entity set

20 entities: the 10 health-connect domain models (with `ClinicalCase` in place of `MedCase`) plus the
10 legacy `professionalService` definitions (`Activity`, `Address`, `Document`, `Medication`,
`Metadata`, `Profile`, `Report`, `Stat`, `Task`, `Team`). Split into two JDL files along the ownership
boundary the JDL already encodes:

- `professional-service.jdl` — 13 entities
- `patient-service.jdl` — 7 entities

## 3. Part 2 — generation and repair

Generation alone produces broken code here. All of the following was measured earlier, not predicted:

1. **77 `.yo-resolve` skip rules** deliberately block eight `professionalService` entities. Remove
   them, or those eight generate incomplete (13 files instead of 21, no `service/`, no `route/`, no
   `.routes.ts`).
2. **Repair generated imports** — templates emit `@fortawesome/angular-fontawesome` (114 files) and
   `@ng-bootstrap/ng-bootstrap/modal` (76 files), packages removed in phase 9, plus
   `app/shared/alert/alert{,-error}` whose real exports are `AlertComponent`/`AlertErrorComponent` in
   `*.component.ts`. Post-process rather than restoring the packages (§ 5, question 2).
3. **Rename ~80 component classes** to carry the `Component` suffix ESLint requires (76 errors seen
   across 19 entities; `ClinicalCase` adds four more).
4. **Wire 20 routes** at the `jhipster-needle-add-entity-route` marker — the generator leaves
   `entity.routes.ts` untouched, so without this everything is unrouted dead code.
5. **i18n for `es`/`fr`/`de`** — generation emits `en` only. Also add `es` to `.yo-rc.json`, which
   still lists `en, fr, de`.
6. **BridgeCare restyle** of the 20 modules — generated templates are pre-migration and will not
   match the rest of the app.
7. **Cypress** — generation writes ~24 specs into a tree with no `cypress` dependency and no config
   (§ 5, question 3).

### The verification trap this plan is built around

`tsc` reports **clean** on broken generated entity code, because unrouted files are unreachable from
`main.ts` and never type-checked. This is exactly how the phase-6 breakage went unnoticed. Therefore:
**no phase may claim success on `tsc` alone.** Routes (step 4) come before any compile claim, and the
real gates are `npm run lint`, the Jest suite, and a browser check.

## 4. Phases

Each is independently reviewable, ends green, and is committed separately on
`refactor/jhipster-entity-layer`.

| #   | Work                                                                                                                                             | Gate                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| 0   | Commit the JDL + definition fixes already on disk; cut the branch                                                                                | JDL validates; 385 tests green                                                 |
| 1   | Rewrite the JDL: relationships for the 3 array fields, 4 enums, split per service                                                                | `jhipster jdl --dry-run` exits 0; definitions match `health-connect.models.ts` |
| 2   | Retire `MedCase`: delete the module, route, i18n, cypress spec, definition; strip the translation layer from `http-health-connect.repository.ts` | 342 tests green; no `MedCase` reference anywhere                               |
| 3   | Remove the 77 `.yo-resolve` guards; generate all 20 entities                                                                                     | 20 folders, 21 files each                                                      |
| 4   | Post-process imports; rename component classes                                                                                                   | `tsc` **and** `npm run lint` both clean                                        |
| 5   | Wire 20 routes at the needle; repoint the sidebar nav to `/clinical-case`                                                                        | every route resolves; browser check on 3 screens                               |
| 6   | i18n across `es`/`fr`/`de`; add `es` to `.yo-rc.json`                                                                                            | no `translation-not-found` in any locale                                       |
| 7   | BridgeCare restyle pass                                                                                                                          | no raw Tailwind palette classes; visual check vs `docs/ui-baseline/`           |
| 8   | Cypress decision; update `AGENTS.md`, `CLAUDE.md`, `professional-web.md`, `README.md`                                                            | full suite green; `webapp:prod` builds; docs match reality                     |

Phases 1–2 are model and deletion work with no generation, so they are cheap to review and cheap to
revert. Phase 3 is the irreversible-feeling one; it lands on a branch and is verified before anything
merges.

**Estimated 5–8 sessions.** Phase 2 alone is a session; phases 4 and 7 are the largest.

## 5. Decisions — all resolved

| #   | Decision                                          | Consequence for the phases                                                                                                                                                                                                                                                                             |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Relationships for all three `string[]` fields** | `ManyToMany ClinicalCase{recommendations} to Recommendation` and `DutyRoster{subscribedProfessionals} to HealthConnectProfessional`. The three flattened `String` fields are dropped. Wire format becomes related objects, so phase 2 updates `health-connect`'s repository, fixtures and their specs. |
| 2   | **Post-process generated imports**                | A re-runnable script rewrites the three bad import patterns after each generation. Bootstrap, ng-bootstrap and Font Awesome stay removed; phase 9's 336 kB → 60 kB CSS reduction is preserved.                                                                                                         |
| 3   | **Delete generated and existing Cypress specs**   | Phase 8 removes the 15 pre-existing dead specs and prevents ~24 more. E2E becomes a separate, explicit decision.                                                                                                                                                                                       |
| 4   | **Keep `Visitation` and `MedicationRecord`**      | Both stay in the JDL so the patient-record panels have a backing model. Entity count stays 20.                                                                                                                                                                                                         |
| 5   | **`role` stays `String`**                         | No `AuthorityRole` enum in the JDL — a fourth declaration of a set that already drifts across three repos is not worth the type safety on a display-only field. JDL carries three new enums: `CaseStatus`, `DutyShiftStatus`, `PatientSex`.                                                            |

## 6. Risks

- **Phase 2 touches `health-connect`**, the one area Reading B was chosen to protect. The repository
  and its spec are the blast radius; the UI components are not.
- **No backend exists for any of this.** Every generated service targets an endpoint that returns
  404 today. The entity layer will look correct and be functionally inert until a backend lands —
  worth being explicit about before investing 5–8 sessions.
- **`.yo-resolve` was added deliberately.** Removing those 77 guards means future regenerations will
  overwrite the eight legacy entities. Whoever added them wanted the opposite; phase 3 should record
  why they were removed.
