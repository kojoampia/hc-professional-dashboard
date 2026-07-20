# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository actually is

A JHipster 8.1.0–generated **Angular frontend gateway** (`hc-professional-dashboard`, npm package `hc-professional-dashboard`) for a healthcare microservice architecture. The app groups entity CRUD UI under two microservice namespaces — `professionalService` and `patientMS`.

**Important reality check:** `pom.xml`, `AGENTS.md`, and `README.md` describe a full Spring Boot 4 / Java 26 backend (Controllers/Services/Repositories, Kafka, MinIO, Liquibase, etc.), but **there is no Java source in this repo** (`src/main/java` and `src/main/resources` do not exist; `.yo-rc.json` sets `"skipServer": true`). The backend microservices live in separate repositories. `pom.xml` is retained from the JHipster generator and is used primarily by the `frontend-maven-plugin` to build the Angular app. Do not assume Java/Spring code exists here — verify before referencing it.

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
npm run e2e                # Cypress E2E (expects a reachable backend)
```

Maven (frontend-driven; `./mvnw` defaults to `spring-boot:run` but no Spring app exists here):

```bash
./mvnw -Dskip.installnodenpm -Dskip.npm    # backend:start script — builds/runs only what exists
npm run backend:unit:test                  # maven verify skipping npm (runs any Java tests; none here)
```

### Running a single test

Jest (Angular spec):

```bash
npx jest --config jest.conf.js src/main/webapp/app/entities/professionalService/address/service/address.service.spec.ts
npx ng test --include="**/address.service.spec.ts"   # via Angular CLI
```

Cypress single spec:

```bash
npx cypress run --spec src/test/javascript/cypress/e2e/<file>.spec.ts
```

## Backend proxy & API URLs

- Dev API traffic is proxied by `webpack/proxy.conf.js` to `http://localhost:5505` (paths: `/api`, `/services`, `/management`, `/v3/api-docs`, `/auth`, `/health`, `/h2-console`). Verify the backend target is running before debugging API issues.
- Build API URLs through `ApplicationConfigService.getEndpointFor(api, microservice?)` (`app/core/config/application-config.service.ts`) — never hardcode service paths.
  - `getEndpointFor('api/addresses')` → `/api/addresses` (gateway/monolith route)
  - `getEndpointFor('api/...', 'professionalService')` → `/services/professionalService/api/...` (microservice route)
- Entity services (`app/entities/<ms>/<entity>/service/*.service.ts`) follow the JHipster pattern: typed model interface + `New*`/`PartialUpdate*` aliases, REST `Rest*` shapes (dayjs fields serialized to/from strings), and `createRequestOption` for query/pagination params. Match this pattern for new entities.

## Frontend architecture

- Source root: `src/main/webapp/app` (configured in `angular.json`).
- Module/folder boundaries (keep responsibilities separated):
  - `core/` — authentication, HTTP interceptors, app config, low-level request/util helpers (singletons).
  - `shared/` — reusable UI helpers, pipes, sort/pagination/filter/date/language/alert utilities.
  - `entities/` — entity modules, split by microservice namespace:
    - `entities/professionalService/` and `entities/patientMS/` — parallel sets of the same domain entities (address, team, task, membership, report, metadata, profile, hc-credential, hc-pay-option, stat, medication; `patientMS` also has `condition`). Each entity has `list`, `detail`, `update`, `delete`, `service`, `route`, plus `<entity>.model.ts` and `<entity>.routes.ts`.
    - `entities/entity.routes.ts` aggregates lazy-loaded entity routes — **currently only `professionalService` routes are registered**; `patientMS` code is present but not wired in (it targets a separate patient microservice). The `/* jhipster-needle-add-entity-route */` comment is the JHipster generator's insertion point.
  - `layouts/` — shell/navbar/footer/error/profiles.
  - `admin/`, `account/`, `home/`, `login/`, `dashboard/`, `pages/`, `widgets/` (histogram, piechart, treemap, slides, chatbot, filter).
- Routing is standalone (`app.routes.ts`) with lazy `loadChildren` per area; route guards via `UserRouteAccessService` with `Authority` constants (`app/config/authority.constants.ts`). i18n is enabled (en/fr/de).

## Conventions

- Indentation: 2 spaces for ts/js/json/yml/html/css/scss, 4 spaces for Markdown (`.editorconfig`).
- Component selector prefix `hpd` kebab-case; directive selector prefix `hpd` camelCase (`.eslintrc.json`).
- Follow existing RxJS/Observable patterns in services and auth state management.
- JHipster generator markers (`// jhipster-needle-*` / `/* jhipster-needle-* */`) denote where the generator inserts code — preserve them.

## Docker / infrastructure

`src/main/docker/` holds compose files for dev dependencies the gateway expects in the wider microservice topology: `mongodb.yml`, `jhipster-registry.yml`, `kafka.yml`, `services.yml` (aggregates mongodb + registry + kafka). `npm run services:up` starts them. Root `docker-compose.yml` (dev) and `docker-compose-prod.yml` build the app image; `Dockerfile` → `Dockerfile.prod`. (MongoDB is the configured database type per `.yo-rc.json`.)
