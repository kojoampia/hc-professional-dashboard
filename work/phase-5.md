# Phase 5 — App shell (navbar / footer / main)

**Branch:** `phase-5` (off `phase-4`)

## What changed

### `layouts/navbar/` — full rebuild

- **Removed the dead "Entities" dropdown entirely** — all 11 links (`address`, `medication`, `stat`, `team`, `task`, `membership`, `report`, `metadata`, `profile`, `hc-credential`, `hc-pay-option`, `document`) pointed at routes deleted by the pre-migration `63c8a16` cleanup commit (`entities/entity.routes.ts` is empty). Removed the now-dead `entitiesNavbarItems`/`EntityNavbarItems` field, its import, and the two now-unreferenced files `entities/entity-navbar-items.ts` and `layouts/navbar/navbar-item.model.d.ts`.
- **Removed the dead Administration links** (`gateway`, `user-management`, `logs` — also deleted by that commit) and kept only the ones that still resolve: `metrics`, `health`, `configuration`, `docs` (gated on `openAPIEnabled`, unchanged).
- **Added the primary HealthConnect nav** (Dashboard/Home, Patients, Cases, Duty Roster) — previously **none** of the app's actual feature routes were reachable from the navbar at all; the only way in was the dashboard auto-embedded on `/`. Added as a desktop `<nav>` next to the logo and mirrored in a mobile menu, matching `professional-demo.html`'s header nav.
- **`ngbDropdown`/`ngbDropdownToggle`/`ngbDropdownMenu` → `MatMenuModule`** (`matMenuTriggerFor`/`mat-menu`/`mat-menu-item`) for the Administration, Language, and Account menus — a real behavioral replacement (focus management, keyboard nav, positioning), not just a class swap.
- **`ngbCollapse` → a signal-driven conditional block** — `isNavbarCollapsed`/`toggleNavbar()` are unchanged on the component; the mobile menu is now `@if (!isNavbarCollapsed) { ... }` instead of the `[ngbCollapse]` directive.
- **Every `fa-icon` → `<mat-icon>`** (Material Icons ligatures: `admin_panel_settings`, `speed`, `favorite`, `settings`, `menu_book`, `translate`, `person`, `build`, `lock`, `logout`, `login`, `menu`).
- Restyled the whole bar with Tailwind: white background, `border-b`, `max-w-7xl` centered content, indigo role badge pill, matching `professional-demo.html`'s header exactly (logo left, primary nav, role badge + shift label + account avatar right).
- `navbar.component.scss` — dropped the `@import 'bootstrap/scss/...'` (only used for a `$navbar-dark-color` variable that's gone now that the version label is a plain Tailwind class); kept only the `.logo-img` background-image rule, which can't be expressed as a Tailwind utility.

### `layouts/footer/` and `layouts/main/`

- Footer switched from `fixed-bottom` (floating over page content, with no compensating padding anywhere) to a normal static footer at the end of a `flex flex-col` page — matching `professional-demo.html`'s footer, and incidentally fixing a layout issue where fixed-bottom could overlap short pages' content.
- `main.component.html` wraps everything in `flex min-h-screen flex-col`, with the router-outlet content in a `flex-1` div, so the footer naturally sits below content instead of needing manual bottom padding.

### `shared/alert/alert.component.*` and `shared/alert/alert-error.component.*`

Replaced `<ngb-alert [type] (closed)>` with a plain Tailwind banner (colored by `AlertType` — success/danger/warning/info map to emerald/rose/amber/indigo) and a `<mat-icon>close</mat-icon>` dismiss button wired to the same `close(alert)` method. Both components' public API (`alerts`, `setClasses`, `close`) is unchanged; only the template's rendering mechanism changed, so nothing that injects `AlertComponent`/`AlertErrorComponent` needed updating.

### `shared/filter/filter.component.*`

Swapped `fa-icon` for `<mat-icon>` and restyled with Tailwind pill/badge styling. Noted in passing: this component's only remaining consumer in the whole repo is `widgets/filter/bar.component.ts` (an out-of-scope playground widget) — every real entity list that used to use it was deleted by the pre-migration cleanup.

### `layouts/profiles/page-ribbon.component.ts`

No change — confirmed already framework-agnostic (plain CSS, no Bootstrap/ngb/FontAwesome), matching the original plan's expectation.

## Explicitly deferred (not done in this phase)

- **`shared/sort/sort-by.directive.ts`** — still FontAwesome-coupled (`@ContentChild(FaIconComponent)`, imperative `.icon =`/`.render()` calls). This is a real structural dependency on FontAwesome's Angular API, not a class-name swap, and its only remaining consumer is the `med-case` list view. Deferred to Phase 6, where that consuming template actually lives — swapping the sort-icon mechanism blind, without the real markup in front of me, risked a subtle behavioral regression for no benefit over doing it right there.

## Net effect on remaining ng-bootstrap/FontAwesome usage

A repo-wide grep after this phase shows `ngbDropdown`/`ngbCollapse`/`ngb-alert`/`NgbModule` now appear **only** in `widgets/widgets.module.ts` (out of scope for this migration) and the still-necessary `shared.module.ts` re-export (kept because `widgets/` still needs it). Everything under `layouts/` and `shared/alert/` is now ng-bootstrap-free.

## Verification

- `npx tsc -p tsconfig.app.json --noEmit` — clean.
- `npx eslint` over every changed file — clean.
- `npx prettier --write` over every changed file — applied (formatting only).
- `npx ng build --configuration production` — succeeds, no errors, no budget warnings.
- `npx ng test --test-path-pattern="health-connect/|shared/|layouts/"` — **283/284 pass**, identical baseline to Phases 2–4.
- Individually re-ran `navbar.component.spec.ts` (template fully overridden in that spec, so only the component-class API is tested — confirmed `account`, `roleBadgeTranslationKey`, `shiftLabel`, `ngOnInit` all still work), `main.component.spec.ts`, and both alert specs — all pass.

## Deferred to later phases

- `SortByDirective`'s FontAwesome coupling — Phase 6 (med-case list is its only consumer).
- Final call on removing `bootstrap`/`@ng-bootstrap/ng-bootstrap`/`@fortawesome/*` packages entirely — Phase 7, blocked on `widgets/` still depending on them (out of this migration's scope, per `application-migration.md`).
