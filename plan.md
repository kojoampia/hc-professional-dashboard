# HealthConnect Professional implementation plan

## Evaluation and source precedence

The target application is a JHipster Angular gateway, currently Angular 17.0.6 with Bootstrap 5, standalone routes, `ngx-translate`, Jest, and `ngx-charts`. It does not currently include Angular Material or Tailwind. Existing selectors must use `hpd-`, not the `app-` prefix proposed by `spec.md` and `master-prompt.md`.

Implementation requirements use this precedence:

1. Existing repository conventions and platform constraints.
2. `spec.md`, because `master-prompt.md` explicitly names it the feature source of truth.
3. `hc-professional-spec.md` for backend/JDL alignment and unresolved domain modelling.
4. `Frontend Technical Specification.md` and `professional-dashboard.md` for architectural intent only where they do not conflict with the above.

The plan deliberately does not create a parallel shell, auth system, or backend contract. It extends the JHipster navbar/footer/account model and initially provides an isolated mock-data adapter that can later use generated entities and REST APIs.

## Decisions required before feature implementation

| ID  | Decision                                                                                                                                                                                                                                                                                    | Why it blocks work                                                                                                            | Proposed default                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| D0  | **Approved:** upgrade Angular 17 to Angular 19 and add Angular Material 19 + Tailwind v4.                                                                                                                                                                                                   | The requested stack requires Angular 19/M3/Tailwind, but the checked-in application is Angular 17 with no Material/Tailwind.  | Upgrade in a separately verified foundation task before UI work.                                                                             |
| D1  | **Approved:** Admin and Doctor may perform all mutations; Nurse, Paramedic, Therapist, and Pharmacist may modify clinical cases, activities, and reports; Carer and User are read-only. Custom clinical `ROLE_*` availability remains a backend dependency.                                 | The frontend may display a role badge but cannot safely authorize clinical mutations based on invented authority assignments. | Enforce the approved UI matrix only after the required server authorities are confirmed; mock mutations remain explicitly non-authoritative. |
| D2  | **Approved:** use the deep-linkable, route-driven 2x3 patient-record overlay from `spec.md`.                                                                                                                                                                                                | The two documents prescribe different layouts and navigation models.                                                          | Do not implement the conflicting tabbed profile layout.                                                                                      |
| D3  | **Approved:** label “Angel” as Emergency contact / next of kin; replace “Grooming” with “Personal care visit”; Copy creates a confirmed draft duplicate; closed-case actions are View, Reopen, and Archive; clinical reports use a separate model from professional-registration documents. | These affect clinical copy, entity mapping, and write behaviours.                                                             | Apply these decisions throughout the feature and reconcile the separate clinical-report model with backend contracts in task 6.              |

## Tasks

### Foundation and decision capture

- [ ] **[0] Record approved decisions D0–D3.** Capture product/technical decisions in the implementation notes, including source precedence and the approved role matrix. **Verify:** every decision above has an owner, recorded outcome, and no implementation uses an unapproved clinical assumption.
- [x] **[1] Inventory the current application integration points.** Identify routes, navbar/footer insertion points, account authority flow, translations, entity patterns, theme entry points, and existing visualisation dependencies. **Verify:** write a file/path map used by later tasks and confirm no parallel shell or auth service is planned.
- [x] **[2] Execute the approved UI-platform baseline.** If D0 approves an upgrade, migrate Angular and its build/test tooling together to Angular 19, then add version-compatible Material and Tailwind; otherwise add version-compatible equivalents without a framework upgrade. Preserve Bootstrap and scope Tailwind preflight so it cannot reset JHipster styles. **Verify:** `npm run lint`, `npm test`, and `npm run webapp:prod` pass after the baseline change.
- [x] **[3] Establish named design tokens and responsive layout primitives.** Add the color, typography, focus, shell, and print tokens from `spec.md` §2 to the approved theme layer; preserve existing global styles. **Verify:** a focused component can consume named semantic tokens, with no new raw feature hex values.
- [x] **[4] Create translations for all new user-visible copy.** Add English, French, and German keys following the existing JHipster locale convention for labels, actions, states, validation, and empty/error/loading content. **Verify:** no new feature template contains hardcoded display copy except deliberately dynamic data.

### Domain contracts, mock boundary, and authorization

- [x] **[5] Define frontend-only feature models.** Add typed models for professional roles, duty rosters/shifts, patient rows/details, records, reports, recommendations, activity logs, case queue rows, pagination, chart data, and view states. Keep them separate from generated entities until API contracts are approved. **Verify:** TypeScript compiles without `any` or duplicate types.
- [x] **[6] Define the backend contract reconciliation map.** Compare the feature models with `hc-professional-spec.md` §7 and existing professional/patient entity services; document mappings and unresolved API fields (cases, duty rosters, reports, recommendation catalog, contacts). **Verify:** each future endpoint/model dependency is classified as existing, missing, or awaiting backend confirmation.
- [x] **[7] Build a replaceable mock repository layer.** Implement `Patient`, `Case`, `DutyRoster`, and recommendation-catalog adapters backed by deterministic fixtures that use the source examples plus enough rows to exercise paging/filtering. Expose signals/selectors while retaining a single replacement point for HTTP services. **Verify:** model-derived counts, lookup, filtering, updates, and resettable error/loading states have unit tests.
- [x] **[8] Implement authority resolution without inventing server authorization.** Map known JHipster account authorities to display roles using a precedence order, retain the full authority set for checks, and add an `hpdHasRole` directive plus route-guard helper only for approved permissions. **Verify:** unit tests cover multiple authorities, no authority, and approved read-only/edit permissions.
- [x] **[9] Extend the existing navbar and footer.** Add the role badge and optional current/next-shift text to the JHipster navbar while preserving session, language, alert, and navigation behaviours; reuse the generated footer. **Verify:** existing navbar/footer tests continue to pass and logged-out rendering does not show a clinical role.

### Shared UI and routing

- [x] **[10] Add the feature route skeleton.** Add lazy route boundaries and guards for dashboard, patients, patient/case detail, case queue, and duty roster; preserve the current home, account, admin, and entity routes. **Verify:** each required URL resolves, rejects unauthorized access per D1, and no existing route regresses.
- [x] **[11] Implement stat-card primitives.** Add accessible `hpd-stat-card` and `hpd-stat-card-row` components with neutral/urgent/open/closed variants, selected state, keyboard activation, and translated labels. **Verify:** component tests assert semantic buttons/links, count presentation, focus visibility, and emitted navigation intent.
- [x] **[12] Implement generic table and pagination primitives.** Build typed data-table, table actions, and independently stateful numbered pagination components with semantic headers and status variants. **Verify:** tests cover page changes, header tint, keyboard action activation, and no-data state.
- [x] **[13] Implement search, controls, and form primitives.** Add debounced search, icon buttons, text input/textarea, checkbox list, upload trigger, and contextual menu components using the approved UI library. **Verify:** tests cover labels, disabled/read-only states, keyboard operation, file selection, and emitted values.
- [x] **[14] Implement dialog and confirmation infrastructure.** Add a reusable accessible dialog wrapper, confirmation contract, focus restoration, and a route-driven overlay host compatible with the approved D2 approach. **Verify:** dialog tests cover focus trap, Escape/close behaviour, cancellation, and return navigation.
- [x] **[15] Add shared asynchronous state presentation.** Implement reusable loading skeleton, empty state, retryable error state, and screen-reader announcements for lists/tables/charts. **Verify:** each state is renderable from the mock repository layer and retry invokes the provided action.

### Dashboard and directory

- [x] **[16] Implement the dashboard route and KPI integration.** Render demographic and case-status cards from computed service data; navigate demographics to patient filters and status cards to the case queue query parameter. **Verify:** route/component tests prove each card creates the correct URL and active count.
- [x] **[17] Implement accessible chart components.** Wrap the approved existing or newly added chart library with line, pie, and grouped-bar components, text alternatives, legends/tooltips, and the approved labels/units. **Verify:** chart data transforms are unit-tested and charts have accessible titles/descriptions without hardcoded SVG paths.
- [x] **[18] Implement the patient directory.** Render the query-backed demographic filter, debounced name search (unless D3 expands scope), table, pagination, and view action; preserve filter/search/page state in URL query parameters. **Verify:** tests cover filtering, pagination, deep-link restoration, and patient-detail navigation.

### Patient record, cases, and activity

- [ ] **[19] Implement the patient-detail route-driven overlay.** Resolve the patient by route parameter and render the deep-linkable overlay shell, title, close/back behaviour, print control, and approved action availability. **Verify:** direct navigation, unknown-patient handling, close-to-directory state restoration, and print stylesheet targeting are tested.
- [ ] **[20] Implement the identity panel and clinical-record panel grid.** Add identity/avatar fallback and reusable paginated panels for cases, visitations, activities, medications, and reports. Use the D3-approved contact terminology. **Verify:** every panel renders its own pager/state and the reports panel uses upload instead of edit.
- [ ] **[21] Implement record actions safely.** Connect per-panel expand/edit affordances, file selection validation at the UI boundary, and a copy confirmation flow that performs only the D3-approved operation. **Verify:** unauthorized users cannot invoke mutation affordances and cancellation produces no local change.
- [ ] **[22] Implement case detail for both entry routes.** Reuse one case-detail component for patient-scoped and standalone URLs; resolve the parent patient, provide reactive Symptoms/Diagnosis/recommendation forms, configurable catalog data, save/cancel/print behaviours, and return routing. **Verify:** `/cases/:caseId` resolves its patient; save updates the mock repository; cancel preserves prior data.
- [ ] **[23] Implement the activity-log dialog.** Open it from Activity Trail, validate title/description, add a timestamped entry on save, and discard drafts on close. **Verify:** unit tests prove save updates only the targeted patient and close leaves the list unchanged.

### Case queue and duty roster

- [ ] **[24] Implement the case queue.** Bind status card selection to `status` query parameters, apply typed header variants, display urgent/open view actions, and show approved closed-case contextual actions. **Verify:** URL, selected card, header tint, and row set remain synchronized through navigation and back/forward.
- [ ] **[25] Implement the duty-roster view and roster scope.** Show subscribed/available rosters, upcoming/active/completed shifts, and subscribe/unsubscribe controls; add “all cases/my roster” scope to case queue based on assigned roster IDs. **Verify:** local subscription changes immediately update header shift text and scoped queue rows.

### Hardening, backend readiness, and handoff

- [ ] **[26] Add feature-level unit tests and route integration tests.** Cover mock services, authority resolution, all shared primitives, URL state, mutations, dialogs, and responsive screen composition. **Verify:** relevant Jest suites pass with the project’s configured runner.
- [ ] **[27] Complete accessibility, responsiveness, and print pass.** Test keyboard-only workflows, 375px layout, contrast/focus, screen-reader names, tables, modal focus, form errors, and patient/case print output. **Verify:** documented manual checks pass and automated accessibility checks used by the repository pass.
- [ ] **[28] Validate production quality.** Run formatting, linting, unit tests, and production build; inspect output budgets and correct feature-caused failures. **Verify:** `npm run prettier:check`, `npm run lint`, `npm test`, and `npm run webapp:prod` succeed.
- [ ] **[29] Produce implementation handoff notes.** Record each `SPEC GAP #n`, approved decision, known backend dependency, mock-to-HTTP replacement point, model/JDL reconciliation, and final component/route coverage. **Verify:** every `spec.md` §5 route and §6 inventory item maps to an implementation or an explicit JHipster extension.

## Dependency flow

`0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11–15 → 16–18 → 19–23 → 24–25 → 26–29`

Tasks 11–15 can run in parallel after task 10. Tasks 16–18 can proceed once their required shared primitives are complete. Task 25 depends on tasks 7, 8, 10, and 24.

## Cross-cutting rules

- Use `hpd-` component selectors and `hpd` directive attributes; repository ESLint overrides documents that specify `app-`.
- Use standalone Angular components and modern control flow only after D0 selects a compatible Angular version; do not silently introduce incompatible Angular 19 APIs into Angular 17.
- Use existing `ApplicationConfigService.getEndpointFor(...)` for all future API calls, never literal microservice URLs.
- Keep translations, visible focus, semantic controls, loading/empty/error states, responsive behaviour, and tests in the task that introduces a component, not as optional polish.
- Do not write a `// SPEC GAP` comment until its assumption is approved or explicitly accepted as a temporary mock-only behaviour.
