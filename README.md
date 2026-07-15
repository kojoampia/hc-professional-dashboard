# hc-professional-dashboard

A JHipster 8.1.0–generated **Angular frontend gateway** for the Health Connect
microservice architecture. It provides the professional dashboard UI — entity
CRUD screens, an analytics dashboard with charting widgets, account/auth/admin
flows, and i18n — and proxies API calls to backend microservices that live in
**separate repositories**.

> **This repository is frontend-only.** It was generated with JHipster
> `"skipServer": true` (see `.yo-rc.json`): there is no Java/Spring Boot source,
> no `src/main/java`, and no `src/main/resources` here. The `pom.xml` is retained
> from the generator and is used by the `frontend-maven-plugin` to build the
> Angular app; it does **not** build a runnable Spring Boot service. The backend
> microservices (e.g. `hcprofessionalservice`) are developed and deployed
> independently.

Documentation for the generator itself is at the
[JHipster 8.1.0 archive](https://www.jhipster.tech/documentation-archive/v8.1.0).

## Technology stack

| Area | Technology |
| --- | --- |
| Framework | Angular 17 (standalone components) |
| Language | TypeScript 5.2 (`target: es2022`) |
| State / data | RxJS 7.8, Angular `HttpClient` |
| UI widgets | ng-bootstrap 16, Font Awesome, custom chart widgets |
| i18n | `ngx-translate` — English, French, German (`src/main/webapp/i18n/{en,fr,de}`) |
| Build | Angular CLI + custom-webpack (`@angular-builders/custom-webpack`), Webpack proxy |
| Unit tests | Jest 29 + `jest-preset-angular` |
| E2E tests | Cypress |
| Database (configured) | MongoDB (dev and prod, per `.yo-rc.json`) — owned by the backend microservices, not this repo |
| Infra (dev deps) | Docker Compose: MongoDB, JHipster Registry, Kafka — see `src/main/docker/` |
| Package manager | npm (`./npmw` wrapper available for a Node-less environment) |

## Project structure

```
src/main/webapp/app/
├── core/        # auth, HTTP interceptors, app config, request/util helpers (singletons)
├── shared/      # reusable UI helpers, pipes, sort/pagination/filter/date/language/alert
├── entities/    # entity modules split by microservice namespace
│   ├── professionalMS/   # Address, Team, Task, Membership, Report, Metadata,
│   │   #                 # Profile, HCCredential, HCPayOption, Stat, Medication, Document
│   └── patientMS/        # parallel set (+ Condition) — present but not routed (see below)
├── dashboard/   # analytics dashboard: metric-panel, status-panel, DashboardService
├── widgets/     # chart/UI widgets: histogram, piechart, treemap, heatmap, linechart,
│                # chatbot, file-viewer, faq, badgebox, info-box, slides, pnv, filter, page-display
├── layouts/     # navbar, footer, error, profiles shell
├── admin/       # JHipster admin screens (users, health, metrics, config, logs, …)
├── account/     # register, activate, password, settings, password-reset
├── home/  login/  config/
└── app.routes.ts
```

### Entity microservice namespaces

Entities are grouped under two namespaces that mirror the backend microservices:

- **`professionalMS`** — the entities this dashboard primarily manages. Their routes
  are registered in `src/main/webapp/app/entities/entity.routes.ts` (lazy-loaded).
  This is the active entity surface.
- **`patientMS`** — a parallel set of the same domain entities plus `Condition`. The
  code is present under `entities/patientMS/` but its routes are **not** wired into
  `entity.routes.ts`; it targets the separate patient microservice.

When adding entities, preserve the `/* jhipster-needle-add-entity-route */` marker —
that is where the JHipster generator inserts new routes.

### API URLs and the dev proxy

- Build every API URL through `ApplicationConfigService.getEndpointFor(api, microservice?)`
  (`app/core/config/application-config.service.ts`) — do not hardcode service paths.
  - `getEndpointFor('api/addresses')` → `/api/addresses` (gateway/monolith route)
  - `getEndpointFor('api/profiles', 'hcprofessionalservice')` → `/services/hcprofessionalservice/api/profiles`
- In development, `webpack/proxy.conf.js` forwards `/api`, `/services`, `/management`,
  `/v3/api-docs`, `/auth`, `/health`, `/h2-console` to `http://localhost:5505`.
  Make sure a backend microservice is reachable there before debugging API issues.

## Development

Requirements: [Node.js](https://nodejs.org/).

Install dependencies (run when `package.json` changes):

```bash
npm install
```

Run the dev server (HMR, served on http://localhost:4200):

```bash
npm start
```

API calls are proxied to the backend at `localhost:5505` (see above).

## Build

Production web build (concatenates/minifies, rewrites `index.html` references):

```bash
npm run webapp:prod
```

Build via Maven (drives the Angular build through `frontend-maven-plugin`):

```bash
./mvnw -Pprod clean verify
```

To package a Docker image and run the full app container:

```bash
docker compose build            # dev image (docker-compose.yml)
docker compose -f docker-compose-prod.yml build   # prod image
docker compose -f src/main/docker/app.yml up -d
```

The production app is served by Nginx (`nginx.conf`, `ngsw-config.json`). PWA/service
worker is disabled by default — to enable, set `enabled: true` in the
`ServiceWorkerModule.register(...)` call in `src/main/webapp/app/app.config.ts`.

## Testing

### Unit tests (Jest)

Specs live alongside components as `*.spec.ts` under `src/main/webapp/app/`:

```bash
npm test                 # ng test --coverage
npm run test:watch       # watch mode
```

Run a single spec:

```bash
npx jest --config jest.conf.js path/to/file.spec.ts
# or
npx ng test --include="**/address.service.spec.ts"
```

### End-to-end tests (Cypress)

E2E specs are in `src/test/javascript/cypress/e2e/entity/*.cy.ts` (one per entity).
They expect a reachable backend/auth endpoint.

```bash
npm run e2e              # headless
npm run e2e:cypress      # Cypress runner
```

Run a single spec:

```bash
npx cypress run --spec src/test/javascript/cypress/e2e/entity/address.cy.ts
```

## Code quality

Lint and format:

```bash
npm run lint
npm run lint:fix
npm run prettier:check
npm run prettier:format
```

Sonar analysis — start a local SonarQube and run the scanner (creds are in
`sonar-project.properties`):

```bash
docker compose -f src/main/docker/sonar.yml up -d
npm run ci:backend:test   # or your usual CI script, then sonar:sonar
```

## Docker for development

`src/main/docker/` holds compose files for the dev dependencies the gateway expects
in the wider microservice topology:

```bash
npm run services:up      # starts MongoDB + JHipster Registry + Kafka (services.yml)
docker compose -f src/main/docker/mongodb.yml up -d     # MongoDB only
docker compose -f src/main/docker/jhipster-registry.yml up   # service registry
docker compose -f src/main/docker/kafka.yml up          # Kafka + Zookeeper
docker compose -f src/main/docker/jhipster-control-center.yml up   # Control Center on :7419
```

## Continuous integration

CI scripts are defined in `package.json` (`ci:backend:test`, `ci:e2e:*`,
`ci:frontend:build`, `ci:frontend:test`, `ci:server:await`). Generate CI pipeline
config with the JHipster `ci-cd` sub-generator if needed; see
[Setting up Continuous Integration](https://www.jhipster.tech/documentation-archive/v8.1.0/setting-up-ci/).

## Useful references

- [JHipster 8.1.0 archive](https://www.jhipster.tech/documentation-archive/v8.1.0)
- [Doing microservices with JHipster](https://www.jhipster.tech/documentation-archive/v8.1.0/microservices-architecture/)
- [Service Discovery and Configuration with the JHipster-Registry](https://www.jhipster.tech/documentation-archive/v8.1.0/microservices-architecture/#jhipster-registry)
- [Using JHipster in development](https://www.jhipster.tech/documentation-archive/v8.1.0/development/)
- [Using JHipster in production](https://www.jhipster.tech/documentation-archive/v8.1.0/production/)
- [Running tests](https://www.jhipster.tech/documentation-archive/v8.1.0/running-tests/)
- [Using Docker and Docker-Compose](https://www.jhipster.tech/documentation-archive/v8.1.0/docker-compose)
- [Node.js](https://nodejs.org/) · [NPM](https://www.npmjs.com/) · [Webpack](https://webpack.github.io/) · [Jest](https://jestjs.io/) · [Angular CLI](https://angular.dev/tools/cli)