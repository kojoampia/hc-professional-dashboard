# Phase 1 Summary - Application Integration Inventory

## Scope

Completed task 1 from `plan.md`: verified the paths and existing conventions that the feature implementation must extend.

## Verified integration map

| Concern                       | Verified paths                                                                                                                                            | Implementation constraint                                                                                                                                                                                                      |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Route root                    | `src/main/webapp/app/app.routes.ts`                                                                                                                       | Add feature routes to the standalone route array while retaining home, account, admin, entity, and error routes.                                                                                                               |
| Existing dashboard            | `src/main/webapp/app/home/home.component.ts`, `src/main/webapp/app/home/home.component.html`, `src/main/webapp/app/dashboard/`                            | The current dashboard is embedded only for authenticated users on `/`; it uses legacy modules, RxJS, and hardcoded metrics. Create the new `/dashboard` as a separate lazy feature route rather than extending this component. |
| Main shell                    | `src/main/webapp/app/layouts/main/main.component.html`                                                                                                    | Preserve the named `navbar` outlet, primary router outlet, generated footer, and page ribbon.                                                                                                                                  |
| Navbar                        | `src/main/webapp/app/layouts/navbar/navbar.component.ts`, `src/main/webapp/app/layouts/navbar/navbar.component.html`                                      | Extend the standalone `jhi-navbar`; preserve account, language, admin, and entity menus. It subscribes to `AccountService.getAuthenticationState()`.                                                                           |
| Footer                        | `src/main/webapp/app/layouts/footer/footer.component.ts`, `src/main/webapp/app/layouts/footer/footer.component.html`                                      | Reuse the generated `jhi-footer`; do not create a parallel feature footer.                                                                                                                                                     |
| Account and authorities       | `src/main/webapp/app/core/auth/account.model.ts`, `src/main/webapp/app/core/auth/account.service.ts`, `src/main/webapp/app/config/authority.constants.ts` | Resolve clinical display roles from `Account.authorities`, preserve JHipster's full authority set, and use `AccountService.hasAnyAuthority()` semantics. Only `ROLE_ADMIN` and `ROLE_USER` are currently declared.             |
| Existing guard and directives | `src/main/webapp/app/core/auth/user-route-access.service.ts`, `src/main/webapp/app/shared/auth/has-any-authority.directive.ts`                            | Follow existing guard and structural-directive patterns; do not introduce a parallel authorization mechanism.                                                                                                                  |
| API endpoints                 | `src/main/webapp/app/core/config/application-config.service.ts`                                                                                           | Future HTTP adapters must call `getEndpointFor(api, microservice?)`; no literal service paths.                                                                                                                                 |
| Entity services               | `src/main/webapp/app/entities/professionalMS/*/service/*.service.ts`                                                                                      | Reuse typed JHipster CRUD, REST date conversion, and `createRequestOption` patterns. `report.service.ts` currently targets `api/reports`; the approved clinical-report model remains separate pending backend reconciliation.  |
| Entity routes                 | `src/main/webapp/app/entities/entity.routes.ts`                                                                                                           | Existing entity routes are lazy-loaded. Preserve JHipster route needle comments.                                                                                                                                               |
| i18n                          | `src/main/webapp/app/shared/language/translation.module.ts`, `src/main/webapp/i18n/{en,fr,de}/`                                                           | Add feature keys in all three locale folders and use the existing `jhiTranslate` / `hpdTranslate` convention.                                                                                                                  |
| Styling                       | `src/main/webapp/content/scss/vendor.scss`, `src/main/webapp/content/scss/global.scss`, `angular.json`                                                    | Bootstrap is globally loaded from `vendor.scss`, followed by `global.scss`. Add Tailwind without removing Bootstrap and prevent its preflight from resetting existing JHipster styling.                                        |
| Providers                     | `src/main/webapp/app/app.config.ts`                                                                                                                       | Add Angular Material providers/imports compatibly with standalone bootstrap and retain browser animations, translations, HTTP interceptors, date adapter, and title strategy.                                                  |
| Charts                        | `package.json`, `src/main/webapp/app/widgets/`, `src/main/webapp/app/dashboard/metric-panel/`, `src/main/webapp/app/dashboard/status-panel/`              | `@swimlane/ngx-charts` is already installed and used by standalone widgets, although legacy dashboard wrappers are NgModules. Prefer standalone wrappers around the approved chart solution after the Angular 19 migration.    |
| Tests and builds              | `package.json`, `jest.conf.js`, `angular.json`                                                                                                            | Use Jest via `npm test`, ESLint via `npm run lint`, and production build via `npm run webapp:prod`.                                                                                                                            |

## Confirmed constraints

- Component selectors must use `hpd-` and directive selectors must use `hpd`, as enforced by `.eslintrc.json`; this overrides the `app-` examples in the supplied specifications.
- The new dashboard, directory, patient detail, case queue, and duty roster are feature routes, not replacements for the JHipster main shell.
- The phase 2 platform migration must retain functional Bootstrap, `@ng-bootstrap/ng-bootstrap`, Font Awesome, translation loading, and existing Jest configuration while introducing Angular 19, Material 19, and Tailwind v4.
- Clinical role authority names beyond `ROLE_ADMIN` and `ROLE_USER` are not currently declared in this frontend and must remain a backend integration dependency.

## Checks

- [x] Routes, main shell, navbar, footer, and authenticated dashboard composition were inspected.
- [x] Account authority flow and existing guard/directive patterns were inspected.
- [x] Translation registration and all supported locale roots were inspected.
- [x] Entity-service API and model conventions were inspected.
- [x] Global style entries, application providers, chart dependencies, tests, and build commands were inspected.
- [x] No parallel shell, authentication service, or endpoint construction strategy is planned.

## Next task

Task 2: migrate the approved UI platform to Angular 19, Angular Material 19, and Tailwind CSS v4 while preserving the verified integration points.
