# Application Migration — Master Phased Plan

**Status:** executing. Derived from `professional-dashboard-migration-plan.md`, re-scoped against the actual state of `main` as of commit `63c8a16` ("cleanup and switch to health-connect dashboard").

## Why this document exists

`professional-dashboard-migration-plan.md` was written against an earlier snapshot of `main`. Before implementation started, `main` moved significantly (commit `63c8a16`, made directly by the repo owner, not by this migration): it deleted every generated CRUD entity under `entities/professionalService/*` (address, team, task, membership, report, metadata, profile, hc-credential, hc-pay-option, stat, medication, document, activity — 13 modules, gone), deleted `admin/gateway`, `admin/logs`, `admin/user-management`, emptied `entities/entity.routes.ts`, renamed most `jhi-`-prefixed selectors to `hpd-`, and pointed `HomeComponent` at `<hpd-dashboard-page>` (the `app/health-connect` implementation) instead of the legacy `<jhi-dashboard>`.

This document is the plan actually being executed. It keeps every phase number and goal from the original plan but corrects scope where reality changed:

- **Phase 6 shrinks from "14 entity CRUD modules" to one:** `entities/patientService/med-case` is the only generated CRUD entity left in the repo (`entities/user` is a model+service used for relationship lookups, not a routed CRUD screen — nothing to restyle there).
- **No Material datepicker migration needed:** a repo-wide check found `ngbDatepicker` is used nowhere anymore (it only existed in the now-deleted entities). Open question #2 in the original plan is moot.
- **Admin dropdown cleanup folds into Phase 5:** the navbar's Entities and Administration dropdowns still contain ~14 dead links to deleted routes (dangling `routerLink`s to `/task`, `/team`, `/admin/gateway`, `/admin/logs`, `/admin/user-management`, etc.) — removing them is now part of the navbar rebuild, not a separate cleanup step.
- Everything else (design tokens, Material M3 theme, Chart.js swap, real API contracts, Patients/Cases/Duty-Roster restyle, shell rebuild, package cleanup) carries over unchanged from `professional-dashboard-migration-plan.md`; that file remains the detailed rationale/inventory reference. This document is the execution-facing index: branches, order, and per-phase done-criteria.

## Decisions locked in for execution (resolving the original plan's open questions)

1. **Patient/Duty Roster backend doesn't exist yet →** Angular-side work (Phases 1, 3, 4) proceeds against `MockHealthConnectRepository`. Phase 1 also ships a fully-written `HttpHealthConnectRepository` implementing the same repository interface against the documented contracts, but it is **not** wired as the active provider yet (no backend to call) — swapping the DI binding is a one-line change once a backend exists. This is called out explicitly in Phase 1's summary.
2. **Material date adapter:** not needed — no remaining template uses `ngbDatepicker`.
3. **`hpdTranslate` vs `jhiTranslate`:** rename every `hpdTranslate` usage to `jhiTranslate` (the one directive that actually exists, `shared/language/translate.directive.ts`). Done opportunistically in whichever phase touches each file (mainly Phase 5 navbar, Phase 6 med-case).
4. **Dark mode:** single light M3 theme only, matching `professional-demo.html`. No dark variant in this migration.
5. **FontAwesome removal timing:** with the entity deletions, the remaining FontAwesome surface is small (navbar, `layouts/`, `admin/health`, `admin/metrics`, med-case templates, legacy `app/dashboard` which Phase 2 deletes outright). Full removal is targeted for Phase 7, not deferred further.

## Branch strategy

Sequential branches, each stacked on the previous, so the final branch naturally contains every prior phase's work. **Nothing merges into `main`.**

```
main
 └─ phase-0   (design tokens + Material M3 theme)
     └─ phase-1   (data contracts + repository layer)
         └─ phase-2   (dashboard screen: stat cards + Chart.js, retire legacy dashboard)
             └─ phase-3   (Patient Directory + Record)
                 └─ phase-4   (Case Queue + Case Detail + Duty Roster)
                     └─ phase-5   (app shell: navbar/footer/main)
                         └─ phase-6   (med-case entity restyle)
                             └─ phase-7   (cleanup, package removal, final verification) ← contains all phases
```

Each phase branch: implement → run `npm run lint` / relevant `npx jest` specs → commit → write `work/phase-<n>.md` summarizing what was done, what was verified, and what's deferred → move to the next phase branch off the current tip.

## Phase index

| Phase | Branch    | Scope                                                                                                                                              | Depends on                      |
| ----- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 0     | `phase-0` | Design tokens (`--hpd-color-*`), Tailwind `@theme` remap, Material Icons font, real Material M3 theme replacing the `azure-blue` M2 prebuilt theme | `main`                          |
| 1     | `phase-1` | Dashboard/patient/case/roster REST contracts as TS types + services; `HttpHealthConnectRepository` written (inactive)                              | `phase-0`                       |
| 2     | `phase-2` | Stat card restyle, `ngx-charts` → Chart.js (`ng2-charts`) for the 3 dashboard charts, retire `app/dashboard/` + clean `HomeComponent`              | `phase-1`                       |
| 3     | `phase-3` | Patient Directory + Patient Record page/panel restyle, overlay host as Material-flavored modal                                                     | `phase-2`                       |
| 4     | `phase-4` | Case Queue, Case Detail, Duty Roster restyle                                                                                                       | `phase-3`                       |
| 5     | `phase-5` | Navbar/footer/main → Material M3 + Tailwind, remove dead entity/admin links, alert/sort/filter icon swap                                           | `phase-4`                       |
| 6     | `phase-6` | `med-case` list/update/detail/delete-dialog restyle; delete dialog moves to the existing Material confirm-dialog                                   | `phase-5`                       |
| 7     | `phase-7` | Remove Bootstrap/ng-bootstrap/FontAwesome, run full lint/test/prettier, final verification, gap summary                                            | `phase-6` (final; contains all) |

## Work log convention

After each phase, a summary is written to `work/phase-<n>.md` (not `phase-[x]` literally — `<n>` is the phase number, 0–7) covering: what changed, files touched, verification performed (commands run + result), and anything deferred or still broken. `work/` is created at repo root on `phase-0` and carried forward on every subsequent branch.
