# hc-professional-dashboard

The **Angular frontend** for the Health Connect / Abofonsa BridgeCare professional portal: the
clinician workspace (dashboard, patients, case queue, duty roster, messages), the applicant
onboarding wizard, the admin review/compliance surfaces, and the JHipster account/admin flows. API
calls go to backend services that live in **separate repositories** (`../gateway`, `../api`).

> **This repository is frontend-only.** It was generated with JHipster `"skipServer": true` (see
> `.yo-rc.json`): there is no Java/Spring Boot source, no `src/main/java`, and no
> `src/main/resources`. The `pom.xml` is retained from the generator so `frontend-maven-plugin` can
> build the Angular app; it does **not** build a runnable Spring Boot service.

Deeper documentation, by audience:

| File                     | For                                                                               |
| ------------------------ | --------------------------------------------------------------------------------- |
| `AGENTS.md`, `CLAUDE.md` | Working in this repo — conventions, route authority tiers, design-token rules     |
| `professional-web.md`    | The consolidated planning record: binding decisions, build traps, unfinished work |
| `../deploy/README.md`    | Deploying the whole three-repo stack                                              |
| `../CLAUDE.md`           | The workspace as a whole and how the three repos fit together                     |

## Technology stack

| Area            | Technology                                                                                    |
| --------------- | --------------------------------------------------------------------------------------------- |
| Generator       | JHipster 9.1.0 (`.yo-rc.json`)                                                                |
| Framework       | Angular 19.2 (standalone components, signals, native control flow)                            |
| Language        | TypeScript 5.5 (`target: es2022`)                                                             |
| Design system   | Angular Material (M3, BridgeCare navy/gold/cream theme) + **Tailwind v4** utilities           |
| Icons           | Material Icons (**Bootstrap, ng-bootstrap and Font Awesome were fully removed**)              |
| Charts          | Chart.js via `ng2-charts`                                                                     |
| State / data    | Angular signals, RxJS 7.8, `HttpClient`                                                       |
| i18n            | `ngx-translate` — English, **Spanish**, French, German (`src/main/webapp/i18n/{en,es,fr,de}`) |
| Build           | Angular CLI + `@angular-builders/custom-webpack`, webpack dev proxy                           |
| Unit tests      | Jest 29 via `@angular-builders/jest` (`jest.conf.js`)                                         |
| E2E tests       | **None working** — see Testing below                                                          |
| Package manager | npm (`./npmw` wrapper available for a Node-less environment)                                  |

Note `.yo-rc.json` still lists `languages: ["en","fr","de"]` even though Spanish is complete in code
and `i18n/`; a regeneration would not know about `es`. `package.json` also carries a stale
`"resolutions"` block pinning Angular 17 — inert under npm, but do not convert it to npm `overrides`.

## Project structure

```
src/main/webapp/app/
├── health-connect/   # THE MAIN FEATURE AREA — clinician + onboarding + admin-review pages,
│                     # charts, API adapters, role guard, repository abstraction
├── core/             # auth, HTTP interceptors, app config, careers handoff, request/util helpers
├── shared/           # reusable primitives: data-table, dialog, form-controls, stat-card,
│                     # async-state, alert/toast, pipes, sort/pagination/filter/date/language
├── layouts/          # BridgeCare shell: sidebar/ (navy nav), main/ (cream topbar), tabbar/
│                     # (mobile), footer, error, profiles. There is no navbar.
├── entities/         # generated CRUD, namespaced by backend service (see below)
├── admin/            # health, metrics
├── account/          # register, activate, password, password-reset, settings
├── home/  login/  config/
└── app.routes.ts
```

Routing is standalone and lazy per area. `health-connect/` uses three distinct authority tiers
(clinician / admin-only / authenticated-but-no-clinical-role for onboarding) — see `AGENTS.md`
before adding a route.

### Entity namespaces — read this before trusting the folder names

- **`entities/patientService/med-case`** is the only generated CRUD entity in the app, and the only
  one registered in `entities/entity.routes.ts`.
- **`entities/professionalService/` is an empty directory.** Its 13 generated entity modules were
  deleted before the BridgeCare migration. Nothing there to route.
- **`.jhipster/` holds ~20 entity definitions, most with no generated code.** They are planned
  entities and generator metadata, not dead references — but do not read them as an inventory of
  what the app implements.

When adding entities, preserve the `/* jhipster-needle-add-entity-route */` marker — that is where
the generator inserts new routes.

### API URLs and the dev proxy

- Build every API URL through `ApplicationConfigService.getEndpointFor(api, microservice?)`
  (`app/core/config/application-config.service.ts`) — never hardcode service paths.
  - `getEndpointFor('api/addresses')` → `/api/addresses` (routed by the gateway directly)
  - `getEndpointFor('api/onboarding', 'professionalService')` →
    `/services/professionalService/api/onboarding`
  - The two service names actually in use are **`professionalService`** and **`patientService`**.
- In development, `webpack/proxy.conf.js` forwards `/api`, `/services`, `/management`,
  `/v3/api-docs`, `/auth`, `/health` and `/h2-console` to `http://localhost:5505`. Make sure the
  gateway is reachable there before debugging API issues. (`/h2-console` is a vestigial
  generator default — the stack is MongoDB-only.)
- In **production** there is no proxy: `npm run webapp:prod` bakes `SERVER_API_URL='/'`, so every
  call is same-origin and `nginx.conf` proxies it to the gateway container. Changing the proxied
  path set means editing **both** `webpack/proxy.conf.js` and `nginx.conf`.

## Development

Requirements: [Node.js](https://nodejs.org/).

```bash
npm install     # when package.json changes
npm start       # dev server with HMR on http://localhost:4200
```

API calls are proxied to the gateway at `localhost:5505`, which reaches `professionalService`
through Consul — so a useful session needs the backend stack up. See `../CLAUDE.md`.

> **Before changing anything under `webpack/`:** `webpack/webpack.custom.js` hand-injects the
> Tailwind v4 postcss plugin, because Angular 19 cannot run Tailwind v4 through its built-in
> support. Remove that hook and **every Tailwind utility class in the app silently stops applying**
> — no build error, no warning. Verify styling changes against a computed style in a real browser,
> not a successful build. Full explanation in `professional-web.md` §4.

## Build

```bash
npm run webapp:prod                                  # production web build
./mvnw -Pprod clean verify                           # same build, driven through frontend-maven-plugin
docker build -f Dockerfile.prod -t hc-professional-dashboard:latest .   # production image (nginx)
```

`Dockerfile.prod` builds the bundle on `node:22-bookworm` (**not** alpine — npm dies there with
"Exit handler never called!") and serves it from nginx with `nginx.conf`. The
`docker-compose.yml` / `docker-compose-prod.yml` pair at the repo root builds dev/prod images for
this app alone; the **full-stack** deployment is `../deploy/`.

PWA/service worker is registered but disabled — set `enabled: true` in the
`ServiceWorkerModule.register(...)` call in `app/app.config.ts` (config in `ngsw-config.json`).

## Testing

```bash
npm test                                       # full Jest suite with coverage
npm run test:watch                             # watch mode
npx ng test --test-path-pattern="<regex>"      # a single spec or a subset
```

`--test-path-pattern` is the **only** form that works for a subset. Two commands earlier versions of
this README recommended do not work:

- `npx jest --config jest.conf.js <path>` fails every file with
  `Cannot use import statement outside a module` — it bypasses the `@angular-builders/jest` layering
  that applies `jest-preset-angular`'s transform. The error is an artefact of the invocation, not a
  repo problem.
- `npx ng test --include=<glob>` — `--include` is not a valid flag for this builder.

**There is no working end-to-end setup.** `cypress` is not a dependency, there is no
`cypress.config.*`, and there are no `e2e`/`e2e:cypress` scripts. The 15 specs under
`src/test/javascript/cypress/e2e/entity/` target entities the app no longer contains and are
unreachable dead code. Either restore the dependency and config or delete them.

## Code quality

```bash
npm run lint
npm run lint:fix
npm run prettier:check
npm run prettier:format
```

Prettier covers Markdown here too, so run it after editing docs. Sonar settings live in
`sonar-project.properties` and a local scanner stack in `src/main/docker/sonar.yml`; note the
`ci:backend:test` script runs Maven `verify`, which builds nothing in this repo.

## Docker for development

`src/main/docker/` holds the generator's dev-dependency compose files:

```bash
npm run services:up                                          # mongodb + jhipster-registry + kafka + zookeeper
docker compose -f src/main/docker/mongodb.yml up -d           # MongoDB only
docker compose -f src/main/docker/kafka.yml up                # Kafka + Zookeeper
```

**These are largely vestigial for this repo.** `services.yml` starts a **JHipster Registry**, but
the real backend discovers services through **Consul** — so bring dependencies up from `gateway/`
or `api/` (`npm run services:up` there), not here. This repo needs no infrastructure of its own
beyond a reachable gateway on :5505.

## Continuous integration

CI scripts are defined in `package.json` (`ci:frontend:build`, `ci:frontend:test`, `ci:backend:test`,
`ci:e2e:*`, `ci:server:await`). The `ci:e2e:*` chain assumes the Cypress setup and a packaged Spring
Boot jar, neither of which exists here.

## Useful references

- [JHipster documentation](https://www.jhipster.tech/documentation-archive/) — this app reports
  generator version 9.1.0 in `.yo-rc.json`
- [Angular CLI](https://angular.dev/tools/cli) · [Angular Material](https://material.angular.io/) ·
  [Tailwind CSS v4](https://tailwindcss.com/) · [Chart.js](https://www.chartjs.org/) ·
  [Jest](https://jestjs.io/) · [Node.js](https://nodejs.org/)
