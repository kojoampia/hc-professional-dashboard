# AGENTS.md — hc-professional-dashboard

Guidance for AI agents working in this repository. Describes the code as it actually is. `CLAUDE.md` in this repo has the same ground truth with more command detail — the two must not contradict each other.

## What this repository is

A JHipster-generated **Angular frontend gateway** (frontend only) for the Health Connect microservice architecture: the professional dashboard UI with entity CRUD screens, hand-built clinician and onboarding screens, an analytics dashboard, account/auth/admin flows, and i18n (en/es/fr/de). `.yo-rc.json` records `jhipsterVersion: 9.1.0`.

**There is no Java or Spring Boot source in this repo.** `.yo-rc.json` sets `"skipServer": true`; `src/main/java` and `src/main/resources` do not exist. The `pom.xml` exists only so the `frontend-maven-plugin` can build the Angular app. The backend lives in the sibling repos `gateway/` (reactive gateway, port 5505) and `api/` (`professionalService` microservice). Do not add backend code, Liquibase changelogs, or JPA entities here — there is nothing for them to attach to.

## Actual technology stack

- Angular 19 (19.2.x), standalone components, TypeScript 5.5, RxJS 7.8
- Angular Material (M3, BridgeCare theme) + Tailwind v4 utilities in `content/css/tailwind.css`; charts are **Chart.js via ng2-charts**
- **Bootstrap, ng-bootstrap and Font Awesome are gone** — fully removed, `styles.css` dropped 336 kB → 60 kB. Material Icons is the only icon font. Don't reintroduce them or copy patterns that assume them.
- ngx-translate (**en/es/fr/de** under `src/main/webapp/i18n/`, four complete catalogs)
- Build: Angular CLI + `@angular-builders/custom-webpack`; dev API proxy in `webpack/proxy.conf.js` → `http://localhost:5505`. **`webpack/webpack.custom.js` also hand-injects the Tailwind v4 postcss plugin — see `professional-web.md` §4 before touching it.**
- Tests: Jest 29 via the Angular builder (`jest.conf.js`). **There is no working Cypress setup** — no dependency, no config, no `e2e` script; the specs under `src/test/javascript/cypress/` are dead code.
- npm (use `./npmw` if Node isn't installed locally)

Two stale-config traps in `package.json` / `.yo-rc.json` — both inert today, both landmines:

- A leftover `"resolutions"` block pins Angular **17** while `dependencies` are on 19. `resolutions` is a Yarn field that npm ignores, so it has no effect as things stand — do not "fix" it by converting it to npm `overrides`, which would actually downgrade the app.
- `.yo-rc.json` still lists `languages: ["en", "fr", "de"]` even though Spanish is fully present in code and `i18n/`. A JHipster regeneration would not know about `es`; add it there if you ever regenerate.

## Commands

```bash
npm install
npm start                  # ng serve --hmr on port 4200, proxying API calls to :5505
npm test                   # full Jest suite with coverage
npx ng test --test-path-pattern="<regex>"   # ONE spec or a subset — the only form that works
npm run lint / lint:fix
npm run prettier:check / prettier:format
npm run webapp:prod        # production build
```

Two commands earlier versions of this file recommended **do not work**, verified by running them:
`npx jest --config jest.conf.js <path>` fails every file with a bogus `Cannot use import statement outside a module` (it bypasses the `@angular-builders/jest` transform layering), and `--include=<glob>` is not a valid flag for this builder. There is no `e2e` script at all.

## Architecture facts that matter

- Source root is `src/main/webapp/app` (`core/`, `shared/`, `entities/`, `health-connect/` (clinician + onboarding feature pages, charts, API adapters), `layouts/`, `admin/`, `account/`, `home/`, `login/`, `config/`).
- **The real UI is `health-connect/`, not `entities/`.** `entities/patientService/med-case` is the only generated CRUD entity in the app and the only route in `entities/entity.routes.ts`. **`entities/professionalService/` is an empty directory** — its 13 modules were deleted before the BridgeCare migration. `.jhipster/` holds ~20 entity definitions, most with no generated code — planned entities and generator metadata, not an inventory of what exists.
- Build API URLs with `ApplicationConfigService.getEndpointFor(api, microservice?)` — never hardcode `/services/...` paths. Everything in the `api/` repo needs the `'professionalService'` second argument; the adapters in `health-connect/api/` are the examples to copy.
- Entity services follow the JHipster pattern (typed model + `New*`/`PartialUpdate*` aliases, `Rest*` wire types with dayjs↔string conversion, `createRequestOption`). Match it for new entities.
- Route guards use `UserRouteAccessService` + `Authority` constants; auth is JWT against the gateway.

### Route authority tiers (`health-connect/health-connect.routes.ts`)

Three distinct tiers — don't copy the wrong one onto a new route:

- **Clinician surfaces** (dashboard, patients, cases, duty roster, messages, about) use the shared `protectedFeatureRoute`: `UserRouteAccessService` + `healthConnectRoleGuard`, admitting admin and all nine clinical roles.
- **Admin surfaces** (`/review`, `/review/:id`, `/compliance`) are `Authority.ADMIN` only, with no role guard.
- **`/onboarding` requires authentication but no clinical role at all** — applicants hold only `ROLE_USER` until approval, so adding the role guard here would lock every applicant out of the wizard. This is deliberate; there's a comment on the route saying so.

### Roles and the mutation matrix

`Authority` (`config/authority.constants.ts`) and `AuthorityRole` (`health-connect/authority-role.ts`) carry the **nine clinical roles**, mirroring `gateway/security/AuthoritiesConstants` and `api/security/AuthoritiesConstants` — a three-repo invariant that drifts silently.

`hasHealthConnectPermission` encodes the same mutating set the api enforces, but expressed differently: admin and doctor return true via an early return, and `CLINICAL_MUTATION_ROLES` holds the other four (nurse, paramedic, pharmacist, therapist). **That is six roles total, matching api's `CLINICAL_MUTATION` — not a four-vs-six drift bug.** Carer, angel, chemist and technician are read-only in v1. The client check is convenience only; `api/config/SecurityConfiguration` is the enforcement point.

### Onboarding and the careers handoff

`../professional-onboarding-workflow.md` (workspace root — it spans all three repos) is the authoritative cross-repo spec. On this side: the applicant wizard (`health-connect/pages/onboarding-page.*`), admin review queue/detail and compliance pages, the first-login acknowledgement interstitial (`health-connect/first-login/`), and the `health-connect/api/` adapters.

`core/careers/careers-handoff.service.ts` implements the inbound contract in `../docs/careers-handoff-contract.md`: `/register?track=&locale=&src=` from `web.abofonsa.com/careers`. Three things must not regress —

- Values are held in **localStorage, not sessionStorage**, because the activation email opens a fresh tab and the value has to survive an anonymous-registration → authenticated-onboarding sign-in.
- Unknown `track`/`locale` values are **dropped, never errors**, and the page works with no parameters at all. The contract depends on that graceful degradation.
- **No personal data** may ever be stored or added to that link.

Note the contract document's ✗ marks are stale — items 1–3 were implemented in WP4b (including adding Spanish); it is otherwise still the agreement.

## Conventions

- Component selector prefix `hpd` (kebab-case), directive prefix `hpd` (camelCase).
- 2-space indentation for ts/js/json/yml/html/scss (`.editorconfig`).
- Preserve JHipster generator needles (`/* jhipster-needle-* */`).
- RFC 7807 error handling, pagination, and alerts follow the generated JHipster helpers in `core/` and `shared/` — reuse them instead of reimplementing.

## Frontend UI conventions

- **BridgeCare design system** (since the 2026-07 restyle; full token table and verified contrast ratios in `professional-web.md` §3): navy `#0D3058` / gold `#C59437` / cream `#F7F4EE` tokens defined as `--hpd-*` custom properties in `content/scss/global.scss` and mapped to Tailwind utilities in `content/css/tailwind.css` `@theme`. **Never hardcode palette hex values or raw Tailwind palette classes (`slate-*`, `indigo-*`, …) in components — use the `hpd-*` token utilities** (`text-hpd-muted`, `bg-hpd-danger-tint`, `rounded-hpd`, `shadow-hpd-sm`, …). Status colors: success/warning text tones are AA-darkened; the demo's original hues live on as `*-accent` tokens for non-text uses. Never put white text on gold (2.7:1) — use the inherited dark tone like `.hpd-btn-gold`.
- **App shell:** navy sidebar (`layouts/sidebar/`, nav model in `shell-navigation.ts` — single source of truth for sidebar groups, mobile tabbar, and topbar crumb/title), cream topbar in `layouts/main/`, mobile bottom tabbar (`layouts/tabbar/`). There is no horizontal navbar anymore.
- **Shared component classes** in `global.scss`: `.hpd-btn{-primary,-gold,-ghost,-danger}`, `.hpd-label`, `.hpd-input`, `.hpd-auth-brand`. Tailwind preflight is **not** loaded; `global.scss` carries the demo's global button reset instead.
- **Toasts:** success confirmations go through `AlertService.showToast(key)` (bottom-center navy pill rendered by `shared/alert/toast-outlet.component.ts`, mounted in the main layout); error/validation banners stay with `hpd-alert`/`hpd-alert-error`.
- The app uses a single uniform font family, **Inter**, across the entire application — the same face the health-connect stat cards render in via inheritance. It's loaded via a Google Fonts `<link>` in `src/main/webapp/index.html` and applied globally on `body` in `src/main/webapp/content/scss/global.scss` (token `--hpd-font-body`), mirrored as Tailwind's `--font-sans` in `src/main/webapp/content/css/tailwind.css`, and matched by Angular Material's M3 theme config (`content/scss/material-theme.scss`). Do not introduce a second font family anywhere; use Tailwind's `font-*` weight utilities for emphasis instead.

## Planning documents

**`professional-web.md` is the single frontend planning document.** It consolidates the 31 plan/spec/phase-log files this repo used to carry (three successive redesigns and their 21 phase logs); the originals are in git history. Read it before any large refactor — in particular:

- **§2 decisions that still bind** — product terminology, the mutation matrix, no dark mode, no role picker, and the BridgeCare non-goals.
- **§3 the design-system palette and the verified AA contrast ratios** (the "never white on gold" rule).
- **§4 build traps** — above all that **Tailwind v4 is hand-wired in `webpack/webpack.custom.js`** and removing that hook silently disables every utility class in the app.
- **§5 unfinished work** — the mock-vs-HTTP repository split, non-functional Cypress, dead dependencies.
- **§6 verified commands**, including the two that older docs got wrong.

Also: `docs/ui-baseline/` — per-phase screenshot baselines plus the `capture.py` that produces them.

### Cross-repo documents (workspace root, one level up)

These moved out of this repo because their subject is the backend or the whole stack. Java and TypeScript comments across all three repos cite them by bare filename:

- `../professional-onboarding-workflow.md` — the onboarding spec: roles, data contracts, status model, domain events, work packages and a per-WP status log. The authority on anything onboarding-related.
- `../professional-dashboard-migration-plan.md` — the original dashboard migration plan; **the origin of the backend endpoint contracts** (dashboard aggregates, patients, med-cases, duty-rosters) that `api/` still owes. Superseded as a _web_ plan, but retained as the contract and rationale reference.
- `../phase_4_contract_reconciliation.md` — the Existing / Missing / Awaiting-confirmation map of every frontend model against a real backend contract. Its `hc-professional-spec.md` §7 citations now resolve to `professional-web.md` Appendix A.
- `../docs/careers-handoff-contract.md` — the inbound careers contract (see above).

## Deployment (WP8)

The deployment bundle is **`../deploy/` at the workspace root**, not in this repo — it deploys all three repos, so it belongs to none of them. `../deploy/docker-compose.professional.yml` runs web + gateway + professionalService + Consul/MongoDB/Kafka behind host nginx on one published port, `127.0.0.1:5503`; the runbook is `../deploy/README.md` and `../deploy/smoke.sh` is the acceptance gate. Nothing there is version-controlled, since the workspace root is not a git repo.

This repo's contribution is just its image: **`Dockerfile.prod`** (built from `../deploy/` as `docker build -f ../web/Dockerfile.prod … ../web`).

This repo's own image is `Dockerfile.prod`: a `node:22-bookworm` build stage (**not alpine** — npm dies there with "Exit handler never called!") feeding an nginx stage. Note how prod API URLs work: `npm run webapp:prod` bakes `SERVER_API_URL='/'` (see `webpack/webpack.custom.js`), so in production every API call is **same-origin** and `nginx.conf` proxies the path set through to the gateway container. The dev-time `webpack/proxy.conf.js` → `:5505` is a separate mechanism; changing the proxied path set means editing **both**.
