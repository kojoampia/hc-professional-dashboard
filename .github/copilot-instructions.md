# Project Guidelines

## Code Style
- This project is an Angular dashboard generated with JHipster.
- Follow `.editorconfig` indentation rules:
  - 2 spaces for `ts/js/json/yml/html/css/scss` files.
  - 4 spaces for Markdown files.
- Follow ESLint selector conventions from `.eslintrc.json`:
  - Component selector prefix: `hpd` with kebab-case.
  - Directive selector prefix: `hpd` with camelCase.
- Use Prettier for formatting:
  - `npm run prettier:check`
  - `npm run prettier:format`

## Architecture
- Frontend source root is `src/main/webapp` (configured in `angular.json`).
- Keep responsibilities separated by existing folders under `src/main/webapp/app`:
  - `core`: authentication, interceptors, app config, low-level utilities.
  - `shared`: reusable UI helpers, pipes, shared module pieces.
  - `entities`: entity modules/services/models and CRUD UI.
  - `layouts`: shell/layout components.
- Keep route-level boundaries in `app-routing.module.ts` using lazy-loaded modules.
- Build API URLs through `ApplicationConfigService.getEndpointFor(...)` instead of hardcoding service paths.

## Build And Test
- Install dependencies: `npm install`
- Development server: `npm start`
- Production web build: `npm run webapp:prod`
- Lint: `npm run lint`
- Auto-fix lint issues: `npm run lint:fix`
- Unit tests: `npm test`
- Cypress E2E: `npm run e2e` or `npm run e2e:cypress`

## Conventions
- Prefer existing npm scripts in `package.json` over ad-hoc commands.
- Use RxJS/Observable patterns already used in services and auth state management.
- Keep entity patterns consistent (model interface + class + identifier helper and typed service CRUD methods).

## Environment Prerequisites
- Local API traffic is proxied by `webpack/proxy.conf.js`; verify backend targets before debugging API issues.
- E2E tests expect accessible backend/auth endpoints.

## Key References
- `README.md` for developer workflows and testing setup.
- `package.json` for canonical scripts.
- `angular.json` for build/source-root configuration.
- `src/main/webapp/app/app-routing.module.ts` for route/module boundaries.
