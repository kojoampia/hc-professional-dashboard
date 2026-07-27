# Phase 9 — Complete Bootstrap/FontAwesome removal + dead code elimination

**Branch:** `phase-9` (off `phase-8`)

## Context

Earlier phases (6, 7) left two deliberate exceptions in place: `SortByDirective` stayed FontAwesome-based (Angular Material's `MatIcon` didn't obviously support the same imperative post-construction icon mutation `FaIconComponent.icon`/`.render()` gave it), and a handful of admin/account/med-case surfaces were flagged but never converted. This phase revisits both exceptions under an explicit instruction to remove Bootstrap and FontAwesome **completely, with no exceptions**, and to delete every component not actually reachable from the running application.

## Task #10 — Dead code removal

Deleted, after independently re-verifying zero reachability via `grep -rl` from each candidate (not just trusting the prior audit):

- `src/main/webapp/app/widgets/**` — the entire legacy widget tree (67 files: badgebox, chatbot, filter/bar, file-viewer, heatmap, histogram, info-box(-sm), linechart, page-display, piechart, pnv, slides, tilebox, treemap). Nothing in `entities/`, `health-connect/`, or any routed page referenced this tree.
- `admin/configuration/*` and `admin/docs/*` (9 files) — routable-looking folder names that `admin.routes.ts` never actually registers (confirmed by reading the routes file directly: only `health` and `metrics` are wired up).
- `entities/user/*` (model/service + spec) and `entities/enumerations/document-type.model.ts` — orphaned since the pre-migration entity cleanup.
- `config/uib-pagination.config.ts` — an ng-bootstrap pagination config object nothing imported.

Also removed the dead `Configuration`/`API` admin menu items from `navbar.component.html`/`.ts` (the `openAPIEnabled` field and its assignment), since they pointed at the just-deleted `admin/configuration`/`admin/docs` routes.

Verification: `tsc --noEmit`, `ng build`, full `ng test` (315/315), `npm run lint` all clean after deletion.

## Task #11 — `login/` and `account/*` off Bootstrap

Restyled `login.component.html` and all six `account/*` form components (`activate`, `password`, `password-reset/init`, `password-reset/finish`, `register`, `settings`) from Bootstrap (`d-flex`/`col-md-*` grid, `alert alert-*`, `form-control`, `form-check*`, `form-label`, `form-text`, `btn btn-primary`, `card jh-card`) to the app's established Tailwind system: a centered `rounded-2xl border border-slate-100 bg-white p-8 shadow-sm` card, rose/amber/emerald alert banners matching the rest of the app's color convention, `hpd-focusable` inputs, and pill-style primary buttons.

Checked every touched spec first (`grep querySelector|classList|nativeElement\.`) — all six either override the template entirely (`.overrideTemplate(Component, '')`) or have zero DOM-class assertions, so no test changes were needed here.

## Task #12 — `admin/health` and `admin/metrics` off Bootstrap/ng-bootstrap/FontAwesome

- **`NgbModal`/`NgbActiveModal` → `MatDialog`/`MatDialogRef`** in `health.component.ts`/`modal/health-modal.component.ts` and (per-block) `jvm-threads.component.ts`/`metrics-modal-threads.component.ts`. Dialogs keep the same `dialogRef.componentInstance.<field> = ...` imperative-assignment pattern the ng-bootstrap version used (both `NgbModalRef` and `MatDialogRef` expose `componentInstance`), so the conversion is minimal-diff rather than a redesign.
- **`fa-icon` → `mat-icon`**, Bootstrap tables (`table-responsive`, `table table-striped`) and badges (`badge`, `bg-success`/`bg-danger`/`bg-info`/`bg-warning`) → Tailwind (`rounded-lg border`, `bg-emerald-100 text-emerald-700` etc. — matching the tests, which asserted exact class-name literals and were updated to match).
- **New shared component:** `shared/progress-bar/progress-bar.component.ts` (`hpd-progress-bar`) replaces `ngb-progressbar` everywhere it appeared (jvm-memory, jvm-threads ×4, metrics-system ×2, metrics-garbagecollector ×2, metrics-request). Takes the same `value`/`max` inputs `ngb-progressbar` did, content-projects the label span that used to render inside the bar.
- Dropped the now-unused `MetricsModalThreadsComponent`/`HealthModalComponent` entries from their parent components' `imports: []` arrays (dialogs opened via `MatDialog.open()` don't need to be declared there — that's only for template usage — and leaving them in produced an `NG8113` "not used within template" build warning even before this phase).

## Task #13 — `med-case` and `SortByDirective` off ng-bootstrap/FontAwesome

- `list/med-case.ts`: `NgbModal` → `MatDialog`; `delete()` now reads `dialogRef.afterClosed()` instead of the ng-bootstrap-specific `modalRef.closed` Subject.
- `delete/med-case-delete-dialog.ts`: `NgbActiveModal` → `MatDialogRef`; `.dismiss()`/`.close(reason)` → `.close()`/`.close(reason)`.
- **`shared/sort/sort-by.directive.ts`** — the deliberately-deferred one. Replaced `@ContentChild(FaIconComponent)` + imperative `.icon =` / `.render()` mutation with `@ContentChild(MatIcon)` (kept only as a presence _guard_ — `onClick()` still no-ops if no icon is projected, preserving the existing "hidden icon → column isn't sortable" contract) plus a plain `icon: SortByIconName` field (`'arrow_upward' | 'arrow_downward' | 'unfold_more'`) recomputed synchronously whenever `SortDirective`'s `predicateChange`/`ascendingChange` fire. The directive now declares `exportAs: 'jhiSortBy'`, so templates bind reactively — `<th jhiSortBy="id" #idSort="jhiSortBy"><mat-icon>{{ idSort.icon }}</mat-icon></th>` — instead of relying on an imperative render call. This sidesteps the Phase 6 blocker entirely: there's no need for `MatIcon` to support post-construction mutation, because the icon name is now a normal template expression re-evaluated on Angular's own change detection (which the directive's `@HostListener('click')` already triggers, being inside the same `OnPush` component's view).
- `med-case.html`: added a `#xSort="jhiSortBy"` template reference per sortable column, swapped `<fa-icon icon="sort" />` for `<mat-icon>{{ xSort.icon }}</mat-icon>`, and dropped the stray `btn-group` class and the dead `row-md jh-entity-details` classes on `med-case-detail.html`'s `<dl>` (superseded by the Tailwind grid classes already sitting next to them).
- Rewrote `sort-by.directive.spec.ts` to assert against the new `.icon` field instead of `FaIconComponent.icon`, and updated `med-case.spec.ts`/`med-case-delete-dialog.spec.ts`/`med-case-detail.spec.ts` for the `MatDialog`/`afterClosed()` API and to drop a vestigial `FaIconLibrary` registration `med-case-detail.spec.ts` no longer needed (the component it was testing had already been fully migrated to Material in an earlier phase; the FontAwesome test setup was simply never cleaned up).

## Task #14 — Global wiring, packages, and a wider sweep

Removing the framework-level wiring surfaced several more components still carrying **live** Bootstrap classes that hadn't been flagged in any prior phase's audit — each of these would have silently lost real, load-bearing CSS (not just cosmetic) the moment Bootstrap's stylesheet disappeared, since none of them had an equivalent Tailwind rule authored to fall back on:

| File                                                              | What was actually Bootstrap-dependent                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `shared/health-connect/form-controls/text-input.component.ts`     | `form-control` (all box-model/border styling)                                                                                                                                                                                                                                                                |
| `shared/health-connect/form-controls/checkbox-list.component.ts`  | `form-check`/`form-check-input`/`form-check-label` (vestigial — Tailwind classes already did the real work)                                                                                                                                                                                                  |
| `shared/health-connect/form-controls/context-menu.component.ts`   | `dropdown`/`dropdown-menu show`/`dropdown-item`, and `btn btn-outline-secondary` on the trigger — **this one was 100% Bootstrap-CSS-dependent**, with no Tailwind fallback at all (positioning, background, shadow, hover state all came from Bootstrap). Rebuilt as a real `absolute`/`z-10` Tailwind menu. |
| `shared/health-connect/form-controls/icon-button.component.ts`    | `btn btn-outline-secondary`                                                                                                                                                                                                                                                                                  |
| `shared/health-connect/dialog/dialog.component.ts`                | `btn btn-outline-secondary` on the close button                                                                                                                                                                                                                                                              |
| `shared/health-connect/data-table/pagination.component.ts`        | `pagination`/`page-item`/`page-link` — vestigial (Tailwind classes were already doing the visual work directly); removed the dead labels and updated `pagination.component.spec.ts`'s `li.page-item button` selector to `li button`                                                                          |
| `shared/health-connect/async-state/loading-skeleton.component.ts` | `.visually-hidden` — Bootstrap 5's class, **not** the same as Tailwind's `.sr-only` (which is what actually exists in this app); swapped to `sr-only`                                                                                                                                                        |
| `home/home.component.html`                                        | Full `row`/`col-md-3 col-sm-12 d-none d-sm-block`/`alert alert-primary`/`display-4` Bootstrap layout — this page was apparently never touched by any earlier Tailwind-migration phase                                                                                                                        |
| `layouts/error/error.component.html`                              | Same — `row`/`col-md-4`/`col-md-8`/`alert alert-danger`, also never previously touched                                                                                                                                                                                                                       |
| `health-connect/pages/patient-directory-page.component.ts`        | `form-check`/`form-check-input`/`form-check-label` label classes                                                                                                                                                                                                                                             |

Found via a repo-wide regex sweep for Bootstrap component-class tokens (`btn-outline`, `form-control`, `form-check`, `dropdown-*`, `d-flex`, `col-md-*`, `table-responsive`, `navbar-nav`, `visually-hidden`, etc.) across every `.html`/`.ts` under `app/`, run _after_ Tasks #10–13 to catch anything the original per-file audit had missed — which turned out to be about a third again as much surface area as originally scoped.

**Global wiring removed:**

- `app.component.ts` — dropped `FaIconLibrary`/`NgbDatepickerConfig` injection and the `fontAwesomeIcons` registration.
- `app.config.ts` — dropped the `{ provide: NgbDateAdapter, useClass: NgbDateDayjsAdapter }` provider.
- Deleted `config/font-awesome-icons.ts` and `config/datepicker-adapter.ts` (no consumers left).
- `shared/shared.module.ts` — dropped `NgbModule`/`FontAwesomeModule` from `imports`/`exports`.
- `package.json` — removed `bootstrap`, `@ng-bootstrap/ng-bootstrap`, `@popperjs/core` (confirmed via `grep` across `node_modules/*/package.json` that Bootstrap was its only remaining consumer), `@fortawesome/angular-fontawesome`, `@fortawesome/fontawesome-svg-core`, `@fortawesome/free-solid-svg-icons`. Ran `npm install --legacy-peer-deps` (matching a pre-existing, unrelated `browser-sync`/`browser-sync-webpack-plugin` peer conflict already present in this repo before this phase) to sync the lockfile — 10 packages removed.
- `content/scss/vendor.scss` — dropped the `bootstrap-variables`/`bootstrap` imports, left the `jhipster-needle-scss-add-vendor` marker in place per JHipster convention.
- `content/scss/global.scss` — dropped the 3 remaining Bootstrap `@import`s at the top, and every rule confirmed (via `grep -rl` for each class name across `app/`) to have zero remaining consumers: `.dropdown-item`/`.dropdown-item.active`/`.dropdown-menu`, `.fa-bars`, `.nav`/`.pagination`/`.carousel`/`.panel-title`, `.navbar`, `.thread-dump-modal-lock`, the bare `.alert`/`.popover` nesting and `.alert-link` under `.alerts`, `.jh-card`, `.form-control`, `.readonly`, `.pad`, `.w-40`/`.w-60`, `.break`, `.hand`, and the already-dead `.table-entities thead th .d-flex > *` / `.row-md.jh-entity-details` rules (both referencing Bootstrap-era class names an earlier phase's partial Tailwind migration had already stopped emitting). Kept everything else: the HealthConnect design-token `:root` block, `.hpd-*` layout primitives, `.footer`, `.browserupgrade` (real, used in `index.html`), `[jhisortby]` (real, still matches `<th jhiSortBy="...">`), the print media query, and the `.ribbon`/`page-ribbon` RTL workaround.
- Deleted `content/scss/_bootstrap-variables.scss` (no importers left).

## What was deliberately not touched

- `@ngu/carousel` and `@swimlane/ngx-charts` — unrelated third-party packages, not in scope for a Bootstrap/FontAwesome removal pass even though a quick check suggests `@ngu/carousel` may itself be unused (zero `carousel` usages found in `app/`). Flagging for a future dependency-audit pass, not fixing here.
- The pre-existing, unrelated `.jhipster/Document.json` → `PersonalDocument.json` rename and the `browser-sync`/`browser-sync-webpack-plugin` peer-dependency conflict (both predate this phase) — left as-is; the latter is why `npm install` needed `--legacy-peer-deps`.
- `.text-small` in `footer.component.html` and the duplicate `a:hover` rule in `global.scss` — harmless, pre-existing dead/redundant CSS unrelated to Bootstrap, out of scope.

## Verification

- `npx tsc -p tsconfig.app.json --noEmit` — clean after every task.
- `npx ng build --configuration development` and `--configuration production` — both clean, zero warnings. `styles.css` dropped from **336.56 kB to 59.95 kB** (dev) confirming Bootstrap's CSS is actually gone from the compiled bundle, not just unreferenced in source.
- `npx ng test` (full suite) — **75/75 suites, 315/315 tests passing** after every task in this phase.
- `npm run lint` — clean.
- `npx prettier --write` across every touched file — clean (only reformatting, no logic changes).
- Repo-wide final sweep — `grep -rn "ngb-\|NgbModal\|NgbActiveModal\|NgbModule\|NgbDate\|fa-icon\|FontAwesome\|@fortawesome\|@ng-bootstrap" src/main/webapp/app` returns zero matches; `node_modules/bootstrap`, `node_modules/@ng-bootstrap`, `node_modules/@popperjs`, `node_modules/@fortawesome` are all empty/absent.
