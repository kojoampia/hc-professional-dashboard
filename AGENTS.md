# AGENTS.md — hc-professional-dashboard

Guidance for AI agents working in this repository. Describes the code as it actually is. `CLAUDE.md` in this repo has the same ground truth with more command detail — the two must not contradict each other.

## What this repository is

A JHipster 8.1.0–generated **Angular frontend gateway** (frontend only) for the Health Connect microservice architecture: the professional dashboard UI with entity CRUD screens, an analytics dashboard, account/auth/admin flows, and i18n (en/fr/de).

**There is no Java or Spring Boot source in this repo.** `.yo-rc.json` sets `"skipServer": true`; `src/main/java` and `src/main/resources` do not exist. The `pom.xml` exists only so the `frontend-maven-plugin` can build the Angular app. The backend lives in the sibling repos `gateway/` (reactive gateway, port 5505) and `api/` (`professionalService` microservice). Do not add backend code, Liquibase changelogs, or JPA entities here — there is nothing for them to attach to.

## Actual technology stack

- Angular 19, standalone components, TypeScript 5.x, RxJS 7.8
- ng-bootstrap, Font Awesome, custom chart widgets; Tailwind utilities in `content/css/tailwind.css`
- ngx-translate (en/fr/de under `src/main/webapp/i18n/`)
- Build: Angular CLI + `@angular-builders/custom-webpack`; dev API proxy in `webpack/proxy.conf.js` → `http://localhost:5505`
- Tests: Jest 29 (`jest-preset-angular`, config `jest.conf.js`); Cypress for E2E (needs a live backend)
- npm (use `./npmw` if Node isn't installed locally)

## Commands

```bash
npm install
npm start                  # ng serve --hmr on port 4200, proxying API calls to :5505
npm test                   # Jest with coverage
npx jest --config jest.conf.js <path-to-spec>   # single spec
npm run lint / lint:fix
npm run prettier:check / prettier:format
npm run webapp:prod        # production build
npm run e2e                # Cypress (backend must be running)
```

## Architecture facts that matter

- Source root is `src/main/webapp/app` (`core/`, `shared/`, `entities/`, `health-connect/` (clinician feature pages + charts + API adapters), `layouts/`, `admin/`, `account/`, `home/`, `login/`, `config/`).
- Entity code is namespaced by backend microservice: only `entities/patientService/med-case` is registered in `entities/entity.routes.ts`; `entities/professionalService/` components exist but are **not routed**.
- Build API URLs with `ApplicationConfigService.getEndpointFor(api, microservice?)` — never hardcode `/services/...` paths.
- Entity services follow the JHipster pattern (typed model + `New*`/`PartialUpdate*` aliases, `Rest*` wire types with dayjs↔string conversion, `createRequestOption`). Match it for new entities.
- Route guards use `UserRouteAccessService` + `Authority` constants; auth is JWT against the gateway.

## Conventions

- Component selector prefix `hpd` (kebab-case), directive prefix `hpd` (camelCase).
- 2-space indentation for ts/js/json/yml/html/scss (`.editorconfig`).
- Preserve JHipster generator needles (`/* jhipster-needle-* */`).
- RFC 7807 error handling, pagination, and alerts follow the generated JHipster helpers in `core/` and `shared/` — reuse them instead of reimplementing.

## Frontend UI conventions

- **BridgeCare design system** (since the web-layout-plan.md migration, 2026-07): navy `#0D3058` / gold `#C59437` / cream `#F7F4EE` tokens defined as `--hpd-*` custom properties in `content/scss/global.scss` and mapped to Tailwind utilities in `content/css/tailwind.css` `@theme`. **Never hardcode palette hex values or raw Tailwind palette classes (`slate-*`, `indigo-*`, …) in components — use the `hpd-*` token utilities** (`text-hpd-muted`, `bg-hpd-danger-tint`, `rounded-hpd`, `shadow-hpd-sm`, …). Status colors: success/warning text tones are AA-darkened; the demo's original hues live on as `*-accent` tokens for non-text uses. Never put white text on gold (2.7:1) — use the inherited dark tone like `.hpd-btn-gold`.
- **App shell:** navy sidebar (`layouts/sidebar/`, nav model in `shell-navigation.ts` — single source of truth for sidebar groups, mobile tabbar, and topbar crumb/title), cream topbar in `layouts/main/`, mobile bottom tabbar (`layouts/tabbar/`). There is no horizontal navbar anymore.
- **Shared component classes** in `global.scss`: `.hpd-btn{-primary,-gold,-ghost,-danger}`, `.hpd-label`, `.hpd-input`, `.hpd-auth-brand`. Tailwind preflight is **not** loaded; `global.scss` carries the demo's global button reset instead.
- **Toasts:** success confirmations go through `AlertService.showToast(key)` (bottom-center navy pill rendered by `shared/alert/toast-outlet.component.ts`, mounted in the main layout); error/validation banners stay with `hpd-alert`/`hpd-alert-error`.
- The app uses a single uniform font family, **Inter**, across the entire application — the same face the health-connect stat cards render in via inheritance. It's loaded via a Google Fonts `<link>` in `src/main/webapp/index.html` and applied globally on `body` in `src/main/webapp/content/scss/global.scss` (token `--hpd-font-body`), mirrored as Tailwind's `--font-sans` in `src/main/webapp/content/css/tailwind.css`, and matched by Angular Material's M3 theme config (`content/scss/material-theme.scss`). Do not introduce a second font family anywhere; use Tailwind's `font-*` weight utilities for emphasis instead.

## Planning documents

This repo doubles as the design-doc archive for the dashboard migration: `spec.md`, `hc-professional-spec.md`, `plan.md`, `professional-dashboard-migration-plan.md`, `phase_*_summary.md`, `professional-onboarding-workflow.md`. Consult them for intent before large refactors.
