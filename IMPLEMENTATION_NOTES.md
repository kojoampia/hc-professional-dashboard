# HealthConnect implementation handoff

## Scope and decisions

HealthConnect extends the generated JHipster shell rather than replacing it. The feature
uses `hpd-` selectors, standalone routes, `ngx-translate`, and the existing Bootstrap
layer. D0 approved Angular 19, Material 19, and scoped Tailwind v4. D1 approves UI
mutations for Admin and Doctor, plus Nurse, Paramedic, Therapist, and Pharmacist for
clinical case/activity/report work; Carer and User are read-only. D2 selects the
deep-linkable route-driven patient overlay. D3 defines emergency-contact terminology,
personal-care visits, confirmed draft copy, closed-case actions, and a separate clinical
report model.

Frontend permission checks are presentation safeguards only. The backend must enforce
every authorization decision.

## SPEC GAP resolutions

| Gap                       | Resolution or deferral                                                                                                                                                                                                                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Authentication/roles   | `authority-role.ts` maps the eight display roles to JHipster authorities and resolves the highest privilege while retaining the full authority list. `hpdHasRole`, `healthConnectRoleGuard`, and mutation controls use the approved matrix. Backend provisioning of custom clinical `ROLE_*` authorities and enforcement remains required. |
| 2. Async states           | `AsyncStateComponent` provides polite loading announcements, empty content, alert error content, and retry. `MockHealthConnectRepository` exposes resettable loading/error state. HTTP failures need mapping when the adapter is implemented.                                                                                              |
| 3. Chart accessibility    | Line, pie, and grouped-bar wrappers expose translated title, description, legend, and axis text alternatives. Fixture counts are illustrative; backend must confirm analytics definitions, units, and aggregation.                                                                                                                         |
| 4. Directory pagination   | The directory uses typed `Page<T>`, a numbered `PaginationComponent`, and URL-backed page state. Backend pagination/count metadata is still missing.                                                                                                                                                                                       |
| 5. “Angel” terminology    | The UI uses “Emergency contact / next of kin.” A future Profile contact relationship must be confirmed; the current generated `Profile.contacts` shape is not a confirmed typed relation.                                                                                                                                                  |
| 6. Domain consistency     | The source wording was normalized to “Personal care visit.” The frontend fixture taxonomy is provisional until the clinical domain owners approve visitation, medication, and recommendation terms.                                                                                                                                        |
| 7. Recommendations        | `Recommendation` is a configurable fixture catalog selected through repository selectors, not a hard-coded enum in case UI. A condition-aware catalog and persistence endpoint are missing.                                                                                                                                                |
| 8. Closed-case menu       | Closed rows provide View, Reopen, and Archive; Reopen/Archive are permission-gated. Product must confirm lifecycle/audit/archive semantics and backend commands.                                                                                                                                                                           |
| 9. Search scope           | Patient Directory search deliberately matches patient name only and preserves `q`, gender, children, and page in the URL. Searchable fields/indexing require backend agreement.                                                                                                                                                            |
| 10. Responsive behavior   | Shared grids collapse at tablet/mobile widths; HealthConnect record, overlay, dialog, controls, stat cards, pagination, and tables have 375px-safe layout rules. Manual browser/device review is still required.                                                                                                                           |
| 11. Print behavior        | Patient/case overlay print controls call `window.print()`. Global print CSS removes shell/actions, converts the fixed overlay to document flow, retains tables/panels, and avoids panel splits. Exact PDF layout remains a browser/manual acceptance decision.                                                                             |
| 12. Copy behavior         | The shared confirmation service and translated prompt define Copy as creation of a confirmed draft duplicate. The current mock repository has no patient-duplicate mutation; backend identity, validation, and persistence must be agreed before exposing a persisted duplicate.                                                           |
| 13. Duty roster           | `/duty-roster` supports subscribed/available roster cards, shifts, subscription controls, header shift labels, and `/cases?scope=mine`. A production calendar, shift conflict rules, and professional roster APIs are missing.                                                                                                             |
| 14. Backend/JDL alignment | Models remain frontend-only and `phase_4_contract_reconciliation.md` is the reconciliation source. No feature HTTP API is assumed or fabricated.                                                                                                                                                                                           |

## Mock-to-HTTP replacement

`HEALTH_CONNECT_REPOSITORY` is the single repository boundary. Replace
`MockHealthConnectRepository` with a typed HTTP adapter only after approved contracts
exist. The adapter must build URLs with
`ApplicationConfigService.getEndpointFor(...)`, preserve the existing models/selectors,
map REST dates, surface loading/error state, and leave fixture tests independent.

The required backend reconciliation is:

- Patient/Profile ownership, directory filtering/paging, avatar, account linkage, and
  typed emergency contact.
- A distinct clinical-case API with status lifecycle, diagnosis, recommendations, parent
  patient, professional, and duty-roster assignment; do not repurpose `Task` without a
  backend decision.
- Activity/visitation, clinical report upload/storage, medication-patient relation, and
  recommendation catalog APIs.
- Professional duty-roster, shift, and subscription APIs. The existing patient-oriented
  `Roster` must not be assumed to be a duty roster.
- Custom authority provisioning and server-side authorization.
- Aggregate analytics/search endpoints and pagination counts.

Existing generated professionalMS clients are adjacent only: `Profile`, `Address`,
`Document`, `Report`, `Task`, `Medication`, `Team`, `Membership`, `Metadata`, `Stat`,
`HC Credential`, and `HC Pay Option`. Their existence does not establish the clinical
relationships above.

## Route checklist

| Spec route                           | Implementation                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `/dashboard`                         | `health-connect.routes.ts` → `DashboardPageComponent`                                            |
| `/patients`                          | `health-connect.routes.ts` → `PatientDirectoryPageComponent`; query-backed filters/search/paging |
| `/patients/:patientId`               | route-driven overlay host → `PatientRecordPageComponent`                                         |
| `/patients/:patientId/cases/:caseId` | patient overlay child → `CaseDetailPageComponent`                                                |
| `/cases?status=urgent\|open\|closed` | `CaseQueuePageComponent`; optional `scope=mine`                                                  |
| `/cases/:caseId`                     | standalone route-driven overlay → `CaseDetailPageComponent`                                      |
| `/duty-roster`                       | `DutyRosterPageComponent`                                                                        |

All entries retain JHipster `UserRouteAccessService` plus `healthConnectRoleGuard`.

## Component checklist

| Spec inventory                         | Implementation / extension                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| App shell, header, footer              | Existing JHipster layouts; navbar adds authority badge and shift label, generated footer retained |
| Stat card / row                        | `shared/health-connect/stat-card/`                                                                |
| Search, table, pagination              | `shared/health-connect/form-controls/search-input.component.ts`, `data-table/`                    |
| Charts                                 | `health-connect/charts/` line, pie, grouped bar wrappers                                          |
| Patient identity / record lists        | `PatientRecordPageComponent` reusable panel/pagination pattern                                    |
| Icon actions                           | `form-controls/icon-button.component.ts` and standard named buttons                               |
| Modal / activity log                   | Material-backed confirmation service plus `DialogComponent` and `ActivityLogDialogComponent`      |
| Case detail / checkbox / text controls | `CaseDetailPageComponent`, `CheckboxListComponent`, `TextInputComponent`                          |
| File upload                            | `FileUploadTriggerComponent` validates MIME type and size at the UI boundary                      |
| Closed-case context actions            | `CaseQueuePageComponent` typed table actions                                                      |
| Authority badge / guard                | navbar extension, `authority-role.ts`, directive, guard                                           |
| Duty roster / roster scope             | `DutyRosterPageComponent` and Case Queue scope controls                                           |

## Accessibility and test coverage

HealthConnect interactive controls have visible focus styling, labels or translated
accessible names, semantic table headers/caption, live async status, permission-aware
disabled/read-only states, and keyboard-operable actions. Route overlays, shared dialogs,
and Activity Log use modal semantics, Escape close, initial focus, and Tab focus
containment; local dialogs restore prior focus on destruction. New Jest coverage verifies
case role mutation blocking/persistence/print, Activity Log validation/save/modal
semantics, patient report mutation blocking, and route-overlay Escape/focus/print.

Automated tests cannot validate visual contrast, real browser printing, responsive
rendering, or screen-reader narration. Those checks require a manual browser/device and
assistive-technology pass.
