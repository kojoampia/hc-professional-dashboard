# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository actually is

A JHipster-generated **Angular 19 frontend** (`hc-professional-dashboard`) for the Health Connect / Abofonsa BridgeCare platform, restyled to the BridgeCare design system. Hand-built clinician screens live under `app/health-connect/`; generated entity CRUD lives under `app/entities/`. **`professional-web.md` is the consolidated planning document** — decisions that still bind, build traps (notably the hand-wired Tailwind v4 pipeline), and unfinished work.

**Important reality check:** `pom.xml` and `README.md` describe a full Spring Boot / Java backend (Controllers/Services/Repositories, Kafka, MinIO, Liquibase, etc.), but **there is no Java source in this repo** (`src/main/java` and `src/main/resources` do not exist; `.yo-rc.json` sets `"skipServer": true`). The backend microservices live in separate repositories. `pom.xml` is retained from the JHipster generator and is used primarily by the `frontend-maven-plugin` to build the Angular app. Do not assume Java/Spring code exists here — verify before referencing it.

## Commands

The frontend dev server is Angular's `ng serve`; the backend API is proxied (see below). Use the npm scripts in `package.json` rather than ad-hoc commands.

```bash
npm install                # install dependencies
npm start                  # ng serve --hmr (dev server, port 4200)
npm run lint               # eslint . --ext .js,.ts
npm run lint:fix           # auto-fix lint
npm test                   # ng test --coverage (Jest; Angular unit tests via jest-preset-angular)
npm run test:watch         # tests in watch mode
npm run webapp:prod        # production web build (ng build --configuration production)
npm run prettier:check     # prettier --check ...
npm run prettier:format    # prettier --write ...
```

Maven (frontend-driven; `./mvnw` defaults to `spring-boot:run` but no Spring app exists here):

```bash
./mvnw -Dskip.installnodenpm -Dskip.npm    # backend:start script — builds/runs only what exists
npm run backend:unit:test                  # maven verify skipping npm (runs any Java tests; none here)
```

### Running a single test

```bash
npx ng test --test-path-pattern="health-connect/charts/chart-transforms"
```

That is the **only** form that works, and it is verified. Two commands this file used to recommend fail:

- `npx jest --config jest.conf.js <path>` — fails every file with `Cannot use import statement outside a module`. It bypasses the `@angular-builders/jest` builder that layers `jest-preset-angular`'s transform on top of `jest.conf.js`. The error is an artefact of the wrong invocation, not a repo problem.
- `npx ng test --include=<glob>` — `--include` is not a valid flag for this builder.

**There is no E2E setup.** No `cypress` dependency, no `cypress.config.*`, no `e2e` script; the specs under `src/test/javascript/cypress/` are unreachable dead code. See `professional-web.md` §5.

## Backend proxy & API URLs

- Dev API traffic is proxied by `webpack/proxy.conf.js` to `http://localhost:5505` (paths: `/api`, `/services`, `/management`, `/v3/api-docs`, `/auth`, `/health`, `/h2-console`). Verify the backend target is running before debugging API issues.
- Build API URLs through `ApplicationConfigService.getEndpointFor(api, microservice?)` (`app/core/config/application-config.service.ts`) — never hardcode service paths.
  - `getEndpointFor('api/addresses')` → `/api/addresses` (gateway/monolith route)
  - `getEndpointFor('api/...', 'professionalservice')` → `/services/professionalservice/api/...` (microservice route)
- Entity services (`app/entities/<ms>/<entity>/service/*.service.ts`) follow the JHipster pattern: typed model interface + `New*`/`PartialUpdate*` aliases, REST `Rest*` shapes (dayjs fields serialized to/from strings), and `createRequestOption` for query/pagination params. Match this pattern for new entities.

## Frontend architecture

- Source root: `src/main/webapp/app` (configured in `angular.json`).
- Module/folder boundaries (keep responsibilities separated):
  - `core/` — authentication, HTTP interceptors, app config, low-level request/util helpers (singletons).
  - `shared/` — reusable UI helpers, pipes, sort/pagination/filter/date/language/alert utilities.
  - `entities/` — entity modules, split by microservice namespace:
    - `entities/entity.routes.ts` registers all **20 generated entities** (13 `professionalservice`, 7 `patientservice`), inserted at the `/* jhipster-needle-add-entity-route */` marker when the JDL is applied. Regenerate with `./scripts/regenerate-entities.sh` — never by hand, and never with a bare `jhipster jdl`.
  - `layouts/` — BridgeCare shell: `sidebar/` (navy sidebar; nav model in `shell-navigation.ts` drives sidebar groups, mobile tabbar, and topbar crumb/title), `main/` (cream topbar + content column), `tabbar/` (mobile bottom tabs), plus footer/error/profiles. There is no horizontal navbar.
  - `health-connect/` — clinician feature pages (dashboard, patients, case queue, duty roster, messages, about), charts, and API adapters.
  - `admin/` (health, metrics), `account/`, `home/`, `login/`, `config/`.
- Routing is standalone (`app.routes.ts`) with lazy `loadChildren` per area; route guards via `UserRouteAccessService` with `Authority` constants (`app/config/authority.constants.ts`). i18n is enabled (**en/es/fr/de** — Spanish was added for the careers handoff; note `.yo-rc.json` still lists only en/fr/de). See `AGENTS.md` for the three route authority tiers, including why `/onboarding` deliberately has no clinical-role guard.

## Conventions

- Indentation: 2 spaces for ts/js/json/yml/html/css/scss, 4 spaces for Markdown (`.editorconfig`).
- Component selector prefix `hpd` kebab-case; directive selector prefix `hpd` camelCase (`.eslintrc.json`).
- Follow existing RxJS/Observable patterns in services and auth state management.
- JHipster generator markers (`// jhipster-needle-*` / `/* jhipster-needle-* */`) denote where the generator inserts code — preserve them.
- **BridgeCare design system:** all colors come from the `--hpd-*` tokens in `content/scss/global.scss`, mapped to Tailwind utilities in `content/css/tailwind.css` (`text-hpd-muted`, `bg-hpd-danger-tint`, `rounded-hpd`, `shadow-hpd-sm`, …). Do not hardcode hex values or raw Tailwind palette classes (`slate-*`, `indigo-*`, …) in components. Shared component classes: `.hpd-btn{-primary,-gold,-ghost,-danger}`, `.hpd-label`, `.hpd-input`. Success toasts via `AlertService.showToast()`. Full background, the verified AA contrast ratios, and the phase log: `professional-web.md`.
- **Uniform font:** the whole application renders in Inter — the same face used (via inheritance, no per-component override) by the health-connect stat cards (`app/shared/health-connect/stat-card/stat-card.component.ts`). It's loaded via the Google Fonts `<link>` in `src/main/webapp/index.html`, applied globally via `body { font-family: var(--hpd-font-body); }` in `content/scss/global.scss` (token defined in that same file's `:root` block), and also set as Tailwind's `--font-sans` in `content/css/tailwind.css` so the `font-sans` utility class agrees with it. Angular Material's M3 theme (`content/scss/material-theme.scss`) already specified `brand-family`/`plain-family: 'Inter'` — this is what makes that config actually render correctly instead of silently falling back to the browser default. Don't introduce a second font anywhere; if a component needs a different weight, use Tailwind's `font-*` weight utilities (`font-medium`, `font-semibold`, `font-bold`, …), not a different family.

## Docker / infrastructure

`src/main/docker/` holds compose files for dev dependencies the gateway expects in the wider microservice topology: `mongodb.yml`, `jhipster-registry.yml`, `kafka.yml`, `services.yml` (aggregates mongodb + registry + kafka). `npm run services:up` starts them. Root `docker-compose.yml` (dev) and `docker-compose-prod.yml` build the app image; `Dockerfile` → `Dockerfile.prod`. (MongoDB is the configured database type per `.yo-rc.json`.)
