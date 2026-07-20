# Master Prompt — HealthConnect Professional (Angular 19 / M3 / Tailwind)

> Feed this whole document to a coding agent (e.g. Claude Code) as the system/task prompt. It assumes `spec.md` (the frontend technical specification) is available in the repo root or attached alongside this prompt. Work through the phases **in order**, stopping at the end of each phase for review before continuing to the next.

---

## Role & Context

You are implementing the frontend for **HealthConnect Professional**, a clinician-facing web dashboard, strictly from `spec.md`. That file is the source of truth for:

- Tech stack (§0.1): Angular 19 standalone components, signals, new control-flow syntax, Angular Material (M3), TailwindCSS, an Angular chart library, a thin service layer, Angular Router.
- Domain model: `AuthorityRole` (§1.1), `DutyRoster`/`DutyShift` (§1.2), `PatientListRow`, `RecordEntry`, `Recommendation`, `ActivityLogEntry`, `CaseQueueRow` (scattered through §3).
- Design tokens: colors (§2.2), typography/iconography (§2.3–2.4).
- Screen-by-screen component breakdown (§3.1–§3.4).
- Route map (§5).
- Component inventory / build checklist (§6).
- Known gaps (§4) — where the spec is intentionally silent, make the smallest reasonable assumption, note it in a `// SPEC GAP:` code comment referencing the gap number, and move on. Do not block on these.

**Existing shell application:** this is being implemented into an **existing JHipster application** that already provides the Angular workspace, build tooling, routing shell, and authentication/account management. Do **not** scaffold a new workspace, and do **not** rebuild the app shell, header, or footer from scratch — the phases below start from Phase 1 and integrate into what JHipster already generated (see Phase 1 for specifics). Before writing any feature code, locate:

- The existing navbar/header component (typically `NavbarComponent` or similar under `webapp/app/layouts/`) — you will extend this, not replace it.
- The existing authentication/authority model (JHipster's `Account`/`authorities` — typically `ROLE_USER`, `ROLE_ADMIN`, etc.) — you will map `AuthorityRole` (§1.1) onto this, not build a parallel auth system.
- The existing theming setup (SCSS variables, Bootstrap classes JHipster ships with by default) — Tailwind and M3 tokens from §2.2 need to coexist with whatever JHipster already has, not fight it.

Read `spec.md` in full before writing any code. Do not invent components, routes, or data fields that aren't in the spec — if something seems missing, check §4 first (it's probably a documented gap with a recommended default).

---

## Working Agreement

1. **One phase at a time, starting at Phase 1.** Complete a phase fully (code + a short self-check) before moving to the next. Summarize and commit to git what you built and any assumptions made at the end of each phase.
2. **Componentize per §6.** Every checklist item in §6 becomes its own standalone component file, `app-` prefixed, in its own folder with a co-located spec/test file if the project has a test runner configured.
3. **Tokens before pixels.** Before building any visual component, port the color table in §2.2 into the Tailwind theme config and/or Angular Material M3 theme so every subsequent component pulls from named tokens (`card-urgent`, `card-open`, `card-closed`, etc.), never raw hex.
4. **Signals-first state.** Use `signal()`/`computed()` for component-local state and a small set of injectable services (`PatientService`, `CaseService`, `DutyRosterService`, `AuthService`) backed by in-memory mock data for now (no real backend exists yet — stub with realistic fixtures matching the interfaces in spec.md).
5. **Mock data realism.** Use the example rows already given in spec.md (e.g. Kojo Ampia-Addison, the three patient rows, the two/five/two urgent/open/closed example cases) as your seed fixtures, extended with a handful of synthetic extras so lists/pagination aren't trivially empty.
6. **Accessibility floor.** Every interactive element needs a visible focus state and correct semantics (buttons are `<button>`, tables use proper `<th scope>`, modals trap focus) — this isn't a separate phase, apply it continuously.
7. **Flag, don't stall, on gaps.** Where §4 documents an open question, pick the recommended default from that section, implement it, and leave a `// SPEC GAP #<n>:` comment. Never pause implementation to ask about these — they're pre-resolved.

---

## Phase 1 — JHipster Integration Points & Stat Cards

Skip building a new workspace or a new app shell — JHipster already provides both. This phase is about wiring into what exists and delivering the one shell-adjacent piece the spec still needs: the stat cards.

1. **Model port.** Port every `interface`/`type` block from spec.md (§1.1, §1.2, §3.2, §3.3, §3.3.1, §3.3.2, §3.4) verbatim into a `core/models/` (or JHipster's equivalent `shared/model/`) location alongside existing generated entity models.
2. **Tokens.** Extend JHipster's existing Tailwind/SCSS setup with the full §2.2 color table as named tokens (`card-urgent`, `card-open`, `card-closed`, etc.) — do not introduce a second, competing Tailwind config; extend the one JHipster generated. If JHipster's app doesn't already have Tailwind configured, add it alongside the existing Bootstrap/SCSS setup without removing JHipster's base styles.
3. **Role mapping.** Map `AuthorityRole` (§1.1: `Doctor`, `Nurse`, `Paramedic`, `Pharmacist`, `Therapist`, `Carer`, `Admin`, `User`) onto JHipster's existing authority system (typically `ROLE_USER` / `ROLE_ADMIN` plus whatever custom authorities exist). Document the mapping table in code comments where the mapping happens — this is effectively resolving **SPEC GAP #1** using JHipster's real auth instead of a placeholder. Build `AuthorityRoleBadgeComponent` to render whichever role the mapped, authenticated JHipster account resolves to.
4. **Header/footer extension, not replacement.** Locate JHipster's existing navbar/footer components. Add the `AuthorityRoleBadgeComponent` and an optional active-shift label (sourced from `DutyRosterService`, §1.2 — stub this service with mock data for now since no roster backend exists yet) into the existing navbar, in the position described by §2.5/§3.1 (top-right, alongside the top URL bar equivalent). Do not rebuild `AppHeaderComponent`/`AppFooterComponent` from the spec's component inventory as new components if JHipster equivalents already exist — extend those instead, but keep the same props/behavior described in §6 for `AppHeaderComponent` so downstream phases can rely on it.
5. **Stat cards.** Build fresh (these do not exist in JHipster's shell): `StatCardComponent` (variants: neutral/urgent/open/closed, §2.2/§3.1) and `StatCardRowComponent`. Wire both rows — demographic (Patients/Female/Male/Kids) and status (Urgent/Open/Closed) — to real counts from `PatientService`/`CaseService` (stub these services with mock data matching spec.md's example figures for now). Status cards must be clickable, navigating to `/cases?status=...`.

**Self-check:** the existing JHipster shell renders unchanged apart from the added role badge/shift label in the navbar; stat cards render with live (mock) counts and status cards navigate correctly; no duplicate/competing app-shell components were created.

---

## Phase 2 — Shared Primitives

Build the remaining shared/reusable components from §6 that aren't screen-specific, placed under JHipster's existing shared-component convention (e.g. `webapp/app/shared/` or wherever this app's reusable components already live — match the existing pattern rather than introducing a new one):

- `SearchInputComponent`
- `DataTableComponent` (generic, `headerVariant` input, row actions, optional pagination)
- `PaginatedListComponent` (10-page numbered pager matching the mockup's `<< Prev 1..10 Next >>` pattern)
- `IconButtonComponent` (Print/Edit/Copy/Close/Save/Cancel variants)
- `ModalComponent` (wrapping `MatDialog`)
- `CheckboxListComponent`
- `TextAreaComponent`, `TextInputComponent`
- `FileUploadTriggerComponent`
- `ContextMenuComponent` (wrapping `mat-menu`)

Each should be usable in isolation (Storybook-style host page or a simple `/dev/components` route is fine if no Storybook is set up) so Phase 3+ can consume them without rework.

**Self-check:** each primitive renders correctly in both light content and against the dark hero background; keyboard navigation works for all of them.

---

## Phase 3 — Dashboard (§3.1)

- Route: `/dashboard`.
- Demographic `StatCardRow` (Patients/Female/Male/Kids) + status `StatCardRow` (Urgent/Open/Closed), the latter clickable and navigating to `/cases?status=...`.
- `ChartCardComponent` wrapping `LineChartComponent` ("Case - Time"), `PieChartComponent` ("Case Distribution"), `GroupedBarChartComponent` ("Case - Patient") — per **SPEC GAP #3**, add sensible axis labels/legend since the mockup omits them; note the assumption inline.
- Demographic card click filters `/patients` by that segment (per §3.1 interaction note).

**Self-check:** clicking any stat card navigates correctly; charts render from `CaseService` mock data without hardcoded SVG paths.

---

## Phase 4 — Patient Directory (§3.2)

- Route: `/patients`.
- `SearchInputComponent` filtering the patient list (per **SPEC GAP #9**, default to matching on patient name only; note the assumption).
- `DataTableComponent` listing `PatientListRow[]` (Date / Patient / Action columns), eye-icon action routing to `/patients/:patientId`.
- Add pagination per **SPEC GAP #4** since the mockup shows no pager for 116 patients — use `PaginatedListComponent` or `mat-paginator`.

**Self-check:** search narrows the list live; navigating to a patient and back preserves scroll/search state reasonably.

---

## Phase 5 — Patient Detail Record (§3.3)

- Route: `/patients/:patientId`, rendered as a deep-linkable overlay per spec (named route / route-driven `MatDialog` — your choice, document which).
- Top bar: `Patient: {name}` + Print/Edit/Copy/Close `IconButtonComponent`s. Wire role-based visibility: use an `*appHasRole` structural directive (§1.1) so `Edit`/`Copy` are hidden or disabled for lower-privilege roles (`Carer`, `User`) — define the permission matrix yourself per **SPEC GAP #1** and document it in a short table in code comments.
- 2×3 panel grid using `RecordListPanelComponent` for Cases / Visitations / Activity Trail / Medications / Reports, and a dedicated `PatientIdentityPanelComponent` for the identity panel (§3.3, item 1).
- Reports panel gets the upload icon (`FileUploadTriggerComponent`) instead of the edit pencil, per spec.
- Wire each panel's `PaginatedListComponent`.

**Self-check:** every panel's expand icon and pencil icon do something (even if `Copy`/`Edit` show a stub confirmation); Reports upload opens a file picker.

---

## Phase 6 — Case Detail Sub-view (§3.3.1)

- Route: `/patients/:patientId/cases/:caseId` **and** standalone `/cases/:caseId` (per §3.4's interaction note — same component, resolves parent patient either way).
- `CaseDetailViewComponent`: Symptoms `TextAreaComponent`, Diagnosis `TextAreaComponent`, Recommendations `CheckboxListComponent` (model the catalog as configurable per **SPEC GAP #7**, not hardcoded to the 4 mockup items — seed it with those 4 as defaults).
- `Print` / `Save` / `Cancel` actions per spec; `Save` persists back through `CaseService` and returns to the panel grid.

**Self-check:** navigating directly to `/cases/:caseId` (no patient in URL) still resolves and displays the correct parent patient name in the header.

---

## Phase 7 — Activity Log Modal (§3.3.2)

- `ActivityLogModalComponent` opened from the Activity Trail panel's expand icon, over a dimmed Patient Detail Record background.
- Title `TextInputComponent` + description `TextAreaComponent` + `Save`.
- On save, append an `ActivityLogEntry` (with `createdAt` set client-side for now) to the Activity Trail panel's list; on close, discard the draft.

**Self-check:** saving updates the Activity Trail list without a full page reload; closing without saving leaves the list untouched.

---

## Phase 8 — Case Queue / Triage List (§3.4)

- Route: `/cases?status=urgent|open|closed`.
- Reuse `StatCardRowComponent` with the **active-filter visual state** the spec explicitly recommends adding (border/tint on the selected status — not shown in the mockup, this is a required addition, not optional).
- `DataTableComponent` with `headerVariant` bound to the current status; urgent/open show single eye-icon action; closed shows the green checkmark **and** `ContextMenuComponent` — per **SPEC GAP #8**, define the menu contents yourself (suggested: Reopen, View, Archive) and note the assumption.
- Row action opens Case Detail (Phase 6's component) via the standalone `/cases/:caseId` route.

**Self-check:** switching status filters updates the URL query param, table tint, and row set together; the active filter's `StatCardComponent` is visually distinguishable from the other two.

---

## Phase 9 — Duty Roster (new screen, §1.2 / SPEC GAP #13)

This screen has no mockup reference — design it cleanly within the existing design language, don't over-build:

- Route: `/duty-roster`.
- `DutyRosterCalendarComponent`: list/calendar of the current professional's subscribed roster(s) and shifts (`upcoming`/`active`/`completed`), with a subscribe/unsubscribe action per available roster.
- `RosterScopeToggleComponent`: adds an "All cases" vs. "My roster" toggle to the Case Queue (Phase 8) that filters `CaseQueueRow[]` by `assignedRosterId` matching the current professional's subscribed roster.

**Self-check:** subscribing/unsubscribing updates `DutyRosterService` state and immediately affects what "My roster" shows in the Case Queue toggle.

---

## Phase 10 — Cross-Cutting Pass

Go back across every screen and add what was deferred during feature work:

- Empty states, loading skeletons, and error states for every table/list/chart (**SPEC GAP #2** — no mockup reference, keep them simple: icon + one-line message + retry action where relevant).
- Responsive breakpoints down to a reasonable tablet/mobile width (**SPEC GAP #10** — mockup is desktop-only; collapse the panel grid to a single column, stack stat cards 2×2 on narrow viewports).
- Confirm `Print` triggers a real `window.print()`-friendly print stylesheet for the Patient Record and Case Detail (**SPEC GAP #11**).
- Confirm `Copy` shows a clear confirmation dialog before duplicating a record (**SPEC GAP #12**).
- Full keyboard-navigation and screen-reader pass across every component built in Phases 1–9.

**Self-check:** resize the app to 375px width and tab through the entire Patient Detail flow using only the keyboard — everything should remain usable.

---

## Final Deliverable Checklist

Before declaring the build complete, confirm every item in `spec.md` §6's checklist has a corresponding component in the repo (excluding `AppShellComponent`/`AppHeaderComponent`/`AppFooterComponent` where JHipster's existing equivalents were extended instead per Phase 1), every route in §5 resolves, and every numbered gap in §4 has either a resolved implementation or a clearly commented assumption in code — including the `AuthorityRole` → JHipster authority mapping from Phase 1, which resolves **SPEC GAP #1**. Produce a short `IMPLEMENTATION_NOTES.md` summarizing every `SPEC GAP #n` assumption made, so product/design can review and confirm or correct them in a follow-up pass.
