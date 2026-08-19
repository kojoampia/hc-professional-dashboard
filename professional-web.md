# professional-web.md — the web frontend's consolidated working notes

Everything the `web/` planning documents established that is still worth knowing, in one place.

This replaces 31 separate markdown files: three generations of plan/spec documents (`spec.md`,
`hc-professional-spec.md`, `Frontend Technical Specification.md`, `.github/app-dashboard-upgrade.md`,
`master-prompt.md`, `professional-dashboard.md`, `plan.md`, `application-migration.md`,
`web-layout-plan.md`, `IMPLEMENTATION_NOTES.md`) and their 21 phase logs (`summaries/`, `work/`).
They are all in this repo's git history if you need the raw detail — `git log --diff-filter=D
--name-only` finds the commit that removed them.

Ground rules for this file: it records **decisions that still bind**, **traps that will cost you a
day**, and **work that is genuinely unfinished**. Anything the code now states more accurately than
prose could — component inventories, file lists, per-phase diffs — was deliberately dropped.
For how to work in this repo, see `AGENTS.md` and `CLAUDE.md`; for backend contracts, see the
cross-repo documents at the workspace root.

---

## 1. Source lineage — three generations, easy to confuse

Documents in this repo described **three successive redesigns** of the same app. Reading an older
one as current is the main hazard the originals presented, so:

| Generation                                                                                                                                    | Drove                                                                                       | Design target                                                                   | Status                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **1. HealthConnect feature build** (`spec.md` → `hc-professional-spec.md`, `plan.md` tasks 0–29, logged in `summaries/phase_*_summary.md`)    | Built the clinician surfaces from scratch against a PDF mockup                              | Mockup palette (blue chrome `#3E7CB1`, teal/`#1FBE9C` charts), `app-` selectors | **Superseded**, except the decisions in §2                    |
| **2. Platform migration** (`professional-dashboard-migration-plan.md` → `application-migration.md`, phases 0–10, logged in `work/phase-*.md`) | Angular 17→19, Material M3, Tailwind v4, ngx-charts→Chart.js, Bootstrap/FontAwesome removal | Indigo `#6366f1` / slate                                                        | **Superseded** visually; its tooling findings (§4) still bind |
| **3. BridgeCare restyle** (`web-layout-plan.md`, phases 0–7)                                                                                  | Navy sidebar shell + the current look                                                       | **Navy `#0D3058` / gold `#C59437` / cream `#F7F4EE`** — see §3                  | **Current**                                                   |

Two consequences worth internalising:

- Any colour, chart palette, or shell description from generation 1 or 2 is **wrong now**. The
  indigo/slate and teal/rose values appear in old notes as deliberate decisions; they were later
  replaced wholesale. §3 is the only palette authority.
- Four of the originals were redundant copies, so the consolidation lost less than the file count
  suggests: `master-prompt.md` and `professional-dashboard.md` were **byte-identical**; `spec.md` was
  a strict subset of `hc-professional-spec.md` (same §1–6, minus the backend entity model); and
  `Frontend Technical Specification.md` and `.github/app-dashboard-upgrade.md` were near-identical
  variants of one prompt-style spec, differing only in framing (a "V2 1-week sprint" header versus
  an "Angular 15→19 upgrade" header).

The generation-1 documents also set a **source-precedence rule** that is still the right tiebreaker
when old prose disagrees with the repo: existing repository conventions win over any spec; then
`spec.md`-family feature intent; then architectural intent from the prompt documents. Concretely,
this is why selectors are `hpd-`, not the `app-` prefix every spec proposed.

## 2. Decisions that still bind

### Product and domain (generation 1, owner-approved)

- **Terminology.** "Angel" is **Emergency contact / next of kin** in all user-facing copy. The
  mockup's "Grooming" visitation type became **"Personal care visit"** — this app is human
  healthcare, not veterinary/personal care.
- **Clinical reports are a separate model from professional-registration documents.** Do not merge
  them on the assumption they are both "documents".
- **Copy creates a draft duplicate only after explicit confirmation.** Closed-case actions are
  **View, Reopen, Archive**.
- **Patient detail is the deep-linkable, route-driven overlay**, not a tabbed profile page. Two
  specs disagreed; the overlay won and is what `route-driven-overlay-host.component.ts` implements.
- **The mutation matrix** — admin and doctor may perform all mutations; nurse, paramedic, therapist
  and pharmacist may modify clinical cases, activities and reports; carer and user are read-only.
  This is the origin of `CLINICAL_MUTATION` in `api/` and of `hasHealthConnectPermission` here. It
  is now enforced server-side; **the client check has always been convenience only.**

### Platform (generation 2)

- **Single light Material M3 theme.** No dark variant anywhere in the app.
- Roles come from the JWT account and are **never user-selectable** — no role picker at sign-in or
  in settings, however convenient it would be for demos.
- `HEALTH_CONNECT_REPOSITORY` intentionally resolves to `MockHealthConnectRepository`. See §5.

### Duty roster: routing and the dashboard bootstrap (owner-approved 2026-08-20)

Three decisions, taken together after `/duty-roster` was found to be serving the wrong screen and
the dashboard to be blanking itself for every non-admin.

- **`/duty-roster` serves the hand-built clinician page; the generated CRUD lives at
  `/entities/duty-roster`.** Both route files declared `duty-roster` — it is their _only_ collision,
  checked — and `entity.routes.ts` was registered first in `app.routes.ts`, so the generated
  JHipster list won. It calls the admin-only `GET /api/duty-rosters`, which is why a clinician
  opening Duty roster read "You are not authorized to access this page", and why the BridgeCare
  page had never been reachable at all. **The clinician page needed no fix**: it already calls `/my`
  for everyone and `listAll()` only behind `isAdmin()`.

  Two changes hold this, because either alone is fragile. The generated route is renamed to
  `entities/duty-roster`, and `health-connect.routes.ts` is now registered **before**
  `entity.routes.ts` so a hand-built screen wins any collision a future regeneration introduces.
  The rename and the six absolute `['/duty-roster', …]` links inside the generated templates are
  re-applied by `scripts/regenerate-entities.sh`, which already does this kind of route surgery for
  `user-management`; without that step the next regeneration silently restores the defect.

- **The dashboard no longer fetches duty rosters.** `loadAll()` called `DutyRosterApiService.list()`
  — the admin-only collection — on every dashboard load. Rosters are not rendered on the dashboard,
  so the call bought nothing and cost every clinician a 403.

- **A failing panel no longer blanks the page.** One shared `error` signal meant that 403 set a
  repository-wide error and `hpd-async-state` replaced the entire dashboard — stat cards, charts and
  all — with "Unable to load this information.", even though patients and cases had loaded fine.
  Patients and cases now carry their own state, and the dashboard's aggregate reports an error only
  when **both** fail.

### BridgeCare non-goals (generation 3) — deliberately _not_ built

The demo at `../docs/Abofonsa_BridgeCare_Professional_Demo.html` contains theatrics that must stay out:
its demo badge and "Restart" chrome, pre-filled credentials, "Continue as guest clinician", the
role selector, and fake pagers (`« 1 2 3 … 10 »`) — the real pagination components stay. Also: do
not downgrade the data-table to the demo's simpler list; the table has sorting, row actions and
pagination the demo lacks.

## 3. Design system — the only palette authority

Tokens are `--hpd-*` custom properties in `content/scss/global.scss`, mapped into Tailwind's
`@theme` in `content/css/tailwind.css`. **Never hardcode hex or stock Tailwind palette classes
(`slate-*`, `indigo-*`, …) in components.** Verified WCAG ratios, measured during the migration:

| Token                                             | Value                             | Notes                                                         |
| ------------------------------------------------- | --------------------------------- | ------------------------------------------------------------- |
| `--hpd-color-primary` (navy)                      | `#0D3058`                         | + `-hover` `#12406F`, `-deep` `#092239`                       |
| `--hpd-color-gold`                                | `#C59437`                         | + `-bright` `#DDB868`, `-tint` `#FBF4E6`                      |
| `--hpd-color-cream`                               | `#F7F4EE`                         | page surface is `#F2F0EA`                                     |
| `--hpd-color-text-primary` / `-muted` / `-subtle` | `#16202C` / `#5B6470` / `#8B939E` | `-subtle` is **large/bold text only** (3.1:1 on white)        |
| `--hpd-color-success`                             | `#2A7554`                         | darkened from the demo's `#2E7D5B` for AA (4.39→4.89 on tint) |
| `--hpd-color-warning`                             | `#96600F`                         | darkened from `#B4741A` (3.50→4.80 on tint)                   |
| `--hpd-color-danger`                              | `#B3402F`                         | 4.88 on tint, no adjustment needed                            |

The demo's original hues survive as `*-accent` tokens for non-text use. Radii are
`--hpd-r-sm/r/r-lg/r-xl` = 8/14/20/28px; shadows `--hpd-sh-sm/sh/sh-lg` are navy-tinted.

**The one hard contrast rule: never put white text on gold — it measures 2.74:1 and fails.** Use
the dark tone `#3A2A08`, as `.hpd-btn-gold` does. Passing pairs for reference: gold on navy 4.85,
gold-300 on navy 7.04, white on navy 13.28, navy on cream 12.10.

Shared classes live in `global.scss`: `.hpd-btn{-primary,-gold,-ghost,-danger}`, `.hpd-label`,
`.hpd-input`, `.hpd-auth-brand`. Success confirmations go through `AlertService.showToast()`
(bottom-centre navy pill); errors and validation stay in the `hpd-alert` banner.

**Font: Inter, one family, everywhere.** Self-hosted from `content/fonts/` and declared in `content/scss/fonts.scss`,
applied on `body` from `--hpd-font-body`, mirrored as Tailwind's `--font-sans`, and matched by
Material's M3 config. Use weight utilities (`font-medium`, `font-semibold`, …) for emphasis —
never a second family.

## 4. Build and tooling traps

These cost real debugging time to find. Each is load-bearing; none is obvious from the code.

### Tailwind v4 does not work through Angular's built-in support — the pipeline is hand-wired

**`webpack/webpack.custom.js` manually injects `@tailwindcss/postcss` into the global-styles
postcss-loader rule. If you remove or "tidy" that hook, every Tailwind utility class in the app
silently stops applying** — no build error, no warning; the CSS just ships with a literal
`@tailwind utilities;` directive in it. This was silently broken for six full migration phases
before anyone checked a computed style in a browser.

Three independent reasons Angular 19 can't do it natively: its Tailwind support only activates
when a `tailwind.config.js` exists (Tailwind v4 doesn't need one); it calls `tailwindcss` with the
**v3** postcss-plugin convention, which v4 moved to the separate `@tailwindcss/postcss` package;
and it sets postcss-loader's `config: false`, so the project's correct `.postcssrc.json` is never
read either. `content/css/tailwind.css` also carries an explicit `@source '../../app';` because v4's
content auto-detection isn't tuned for this `src/main/webapp/app` layout.

Verify a change here by checking a computed style in a real browser, not by a successful build.

### Tailwind preflight is not loaded — two consequences

`tailwind.css` imports only `tailwindcss/theme` and `tailwindcss/utilities`. So:

- Form controls don't inherit the page font. `global.scss` carries the one preflight rule that was
  actually needed: `button, input, select, textarea, optgroup { font-family: inherit }`. Without it
  every `<button>` — including every `mat-menu-item` — renders in the platform UI font (Arial).
- `global.scss` also carries the demo's global button reset and `list-none` on panel lists, because
  no preflight means native bullets and native button chrome.

Do not import full preflight to fix a narrow issue; it would reset margins, borders and appearance
across every control in the app.

### Angular Material injects its CSS at runtime, after your stylesheet

Material's component styles land in `<head>` when the component first renders — _after_ the static
stylesheet is parsed. Against a same-specificity Tailwind utility, Material wins on source order.
A responsive utility like `md:hidden` placed directly on a `mat-icon-button` therefore **never
hides it**. Fix by moving the utility onto a plain wrapper element that Material's styles don't
touch, rather than escalating with `!important`.

### Directive selectors are `jhi*`, not `hpd*`

Component selectors and directive _attributes_ introduced by this app use `hpd`, but the
JHipster-generated shared directives kept their original names. `hpdTranslate`, `hpdSort` and
`hpdSortBy` **do not exist** — the real ones are `jhiTranslate`, `jhiSort`, `jhiSortBy`. This
mistake recurred across several phases; templates using the `hpd` spelling fail silently (a
non-existent attribute directive is just an unknown attribute).

## 5. Current state and unfinished work

### The frontend runs on mock data by design

`HEALTH_CONNECT_REPOSITORY` resolves to `MockHealthConnectRepository`. A complete
`HttpHealthConnectRepository` exists, is unit-tested, and is **not wired in** — swapping the DI
binding is a one-line change once endpoints exist. It uses a read-through-cache pattern because the
repository interface is synchronous and signal-based while HTTP is not.

Three known compromises in that HTTP implementation, all flagged in code:

- ~~`updateCase` joins `recommendationIds` with commas into a free-text field~~ — **resolved.**
  `MedCase` was retired in favour of `ClinicalCase`, whose `recommendations` is a real ManyToMany
  relationship, so the comma-join is gone.
- `professionalIdForAccount` / `shiftLabelForAccount` return `null` over HTTP; no
  professional-directory endpoint was ever specified. The mock resolves them from a fixture.
- `ClinicalCaseService` calls plain `api/clinical-cases`, **not** a `services/patientService/...`
  path — for a `skipServer` client the `microservice` JDL option does not add a URL prefix. The real
  URL is asserted in `http-health-connect.repository.spec.ts`; don't "correct" it.

### Open follow-ups

| Item                                                      | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cypress is entirely non-functional**                    | There is no `cypress` dependency, no `cypress.config.*`, and no `e2e` npm script. The specs under `src/test/javascript/cypress/e2e/` are dead code. `npm run e2e` — documented for a long time, including by me — **does not exist**. Either restore the config and dependency or delete the specs.                                                                                                                                                                                           |
| **Two dead dependencies**                                 | `@swimlane/ngx-charts` (^23.1.0) and `@ngu/carousel` (^19.0.0) are installed with **zero references** in `app/`. Charts are Chart.js + ng2-charts. Removal is a small, safe win.                                                                                                                                                                                                                                                                                                              |
| **Stale Angular pin in `package.json`**                   | A leftover `"resolutions"` block pins Angular **17** while dependencies are on 19. Inert under npm (a Yarn field), but converting it to npm `overrides` would silently downgrade the app.                                                                                                                                                                                                                                                                                                     |
| **`.yo-rc.json` omits Spanish**                           | Lists `languages: ["en","fr","de"]` though `es` is complete in code and `i18n/`. A regeneration would not know about it.                                                                                                                                                                                                                                                                                                                                                                      |
| **`npm install` cannot run as-is**                        | `browser-sync-webpack-plugin@2.3.0` requires `browser-sync@^2` and the repo has `3.0.4`, so a bare `npm install` — with no new package at all — fails ERESOLVE. The tree has to be built with `--legacy-peer-deps`. Pre-existing, and it blocks adding any dependency until the plugin is dropped or upgraded.                                                                                                                                                                                |
| **"New patient" CTA is a stub**                           | The gold topbar button navigates to `/patients` because no patient-creation flow or endpoint exists. Retarget it when one lands.                                                                                                                                                                                                                                                                                                                                                              |
| **Recommendation labels show `translation-not-found[…]`** | The mock repository feeds literal labels where the checkbox list expects i18n keys. Pre-existing, cosmetic.                                                                                                                                                                                                                                                                                                                                                                                   |
| **Case queue "mine" scope cannot work**                   | The toggle filters on `DutyRoster.subscribedProfessionalIds`, which the backend has never returned: `api`'s `DutyRoster` is a flat assignment (`date`, `duty`, `professionalId`, `shift`, `name`) with no subscriber list, and `DutyRosterResource` states there is **deliberately no self-subscription endpoint**. So "mine" yields zero cases for everyone. Pre-existing and unrelated to the routing fix; needs a product decision on what "mine" should mean against an assignment model. |
| **`DutyRosterApiService` targets a rejected contract**    | Its `subscribe()`/`unsubscribe()` POST and DELETE `/api/duty-rosters/{id}/subscription`, which does not exist and by the resource's own comment never will. Its `list()` is no longer called after the dashboard change. The live roster path is `DutyRosterAssignmentsService` (`/my`). Delete or rewrite it rather than leaving two services for one concept.                                                                                                                               |
| **`MedCase.json` microservice name is wrong**             | Says `hcPatientService`; the real folder and every sibling file use `patientservice`.                                                                                                                                                                                                                                                                                                                                                                                                         |
| **~10 orphaned `.jhipster/*.json` specs**                 | Entity definitions whose Angular code was deleted before the migration. Harmless generator metadata, never cleaned up.                                                                                                                                                                                                                                                                                                                                                                        |

### What was finished

The BridgeCare migration completed in full: navy sidebar shell (the horizontal navbar is gone),
all care screens plus entity/admin surfaces restyled, **zero raw Tailwind palette classes remaining
in non-spec app code**, and an **axe-core WCAG 2 A/AA audit passing with 0 violations** on login,
dashboard, patients, cases and patient-record. Bootstrap, ng-bootstrap and FontAwesome are entirely
removed — `styles.css` fell from 336 kB to 60 kB. Screenshot baselines for every phase, including
a matched before/after pair, are in `docs/ui-baseline/`, reproducible via its `capture.py`.

One notable rescue along the way: `entities/patientservice/med-case` was unreachable from the
compiled app (empty `entity.routes.ts`), so it had never been type-checked or tested. Wiring it in
exposed ~10 real bugs from a mismatched JHipster blueprint. Fixing it additively extended
`shared/sort` (`SortState`, `buildSortParam`, `parseSortParam`) and `core/util/parse-links.service.ts`
(`parseAll`) — both had zero other consumers at the time. Generated specs also arrived importing
`vitest`; this project uses Jest.

## 6. Verified commands

Checked by running them, not copied from the older docs — which had two commands wrong:

```bash
npm start                                        # ng serve --hmr, port 4200, proxies API to :5505
npm test                                         # full Jest suite via the Angular builder
npx ng test --test-path-pattern="<regex>"        # ONE spec or a subset — the only form that works
npm run lint / lint:fix
npm run prettier:check / prettier:format
npm run webapp:prod                              # production build
```

**Two commands that older docs recommended and that genuinely fail:**

- `npx jest --config jest.conf.js <path>` fails every file with a bogus parse error
  (`Cannot use import statement outside a module`). It bypasses the `@angular-builders/jest`
  layering that applies `jest-preset-angular`'s transform. The error is an artefact of the wrong
  invocation, not a repo problem.
- `npx ng test --include=<glob>` — `--include` is not a valid flag for this builder.
  `--test-path-pattern` (or `--testPathPattern`) is.

There is **no `e2e` script**; see §5.

## 7. Backend contracts

Contract documents live at the **workspace root**, because `api/` and `gateway/` need them too:

- `../docs/professional-onboarding-workflow.md` — the onboarding spec (roles, lifecycle, documents,
  domain events, duty roster). Authoritative for anything onboarding-related.
- `../docs/professional-dashboard-migration-plan.md` — origin of the dashboard-aggregate, patient,
  med-case and duty-roster endpoint contracts `api/` still owes.
- `../docs/phase_4_contract_reconciliation.md` — every frontend model classified Existing / Missing /
  Awaiting confirmation. **Its `hc-professional-spec.md` §7.x citations now resolve to Appendix A
  below.**
- `../docs/careers-handoff-contract.md` — the inbound careers link contract.

## Appendix A — the original backend entity model (former `hc-professional-spec.md` §7)

Derived from the microservice architecture diagram and the registration wireframe, this was the
draft JDL basis for the backend. **`api/` has since implemented most of it**, so treat the real
domain classes in `api/src/main/java/net/jojoaddison/domain/` as authoritative and this as the
record of intent — including which questions were left open.

| §7 entity                        | Fields as specified                                                                            | Where it landed                                                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Profile`                        | firstName, middleName, lastName, dateOfBirth, sex, mobilePhone, email, idType, idNumber, title | Built; extended by onboarding WP2 (embedded emergency contact, `specialtyCategoryId`, `teamIds`, unique `accountId`) |
| `Address`                        | digitalAddress, streetAddress, townDistrict, cityState, region, country                        | Built                                                                                                                |
| `Document`                       | name, description, url, timestamp, documentType, otherTypeLabel                                | Built as `PersonalDocument`; WP2 added checksum, size, `expiryDate`, verification fields                             |
| `Category`, `Activity`, `Team`   | name, description (+ `Activity.patient`, `Team.supervisor` → Profile)                          | Built                                                                                                                |
| `Roster`                         | name, description, date, duration; `patient` → Profile                                         | Built                                                                                                                |
| `Credential`, `Option` (gateway) | email, phone, password, role / category, userId, metadata                                      | **Not built as entities** — `Credential` was correctly identified as JHipster's own `User`                           |

Enumerations specified: `Sex {MALE, FEMALE}`, `IdentificationType {PASSPORT, GHANA_CARD}`,
`DocumentType {CERTIFICATE, PASSFOTO, PASSPORT, GHANA_CARD, OTHER}`.

**The decisions in it that still matter:**

- **`Roster` ≠ `DutyRoster`.** `Roster` is patient-scoped (a patient's scheduled activity);
  `DutyRoster` is professional-scoped (a clinician's on-call schedule). They were explicitly kept
  separate, and `api/` has both. They read as redundant to anyone who doesn't know this.
- **`Profile.contacts` should be a self-referential many-to-many**, not flat name/phone text — so
  an emergency contact can link through to their own record. This was the recommended resolution
  for the "Angel" field. `api/` currently embeds an `EmergencyContact` instead; the flat-vs-relation
  question is therefore still effectively open.
- **`Credential` is JHipster's `User`.** Do not model a parallel password-bearing entity, and reuse
  the authority enum rather than defining a second role type.
- **Still unresolved:** `Category`'s relationships (left unattached in the draft JDL), and whether
  one document entity should serve both professional-registration documents and clinical reports —
  note that §2's product decision says **clinical reports stay a separate model**, which is the
  answer this spec was waiting for.

## Appendix B — phase history

Compact index of what each phase series delivered, for archaeology against git history.

**Generation 1 — feature build** (`plan.md` tasks 0–29, 10 `summaries/` logs): approved decisions →
integration inventory → Angular 19 / Material 19 / Tailwind v4 baseline → design tokens and i18n →
frontend models, contract reconciliation map, mock repository, authority resolution → route
skeleton and shared primitives (stat cards, data table, pagination, search, forms, dialogs, async
states) → dashboard, directory → patient record, case detail, activity log → case queue, duty
roster → hardening (a11y, 375px, print) and `IMPLEMENTATION_NOTES.md`. Final state: 162 suites /
732 tests green. Automated a11y and manual visual checks were explicitly _not_ run at that point.

**Generation 2 — platform migration** (`application-migration.md` phases 0–10, 11 `work/` logs):
0 design tokens + real M3 theme · 1 REST contract layer + inactive `HttpHealthConnectRepository` ·
2 dashboard restyle, ngx-charts→Chart.js, legacy `app/dashboard/` deleted · 3 directory + record ·
4 queue, case detail, roster · 5 navbar/footer/main · 6 med-case rescue (above) · 7 **found and
fixed the broken Tailwind pipeline** · 8 `.jhipster/*.json` definitions for health-connect models
(incl. rewriting a `Patient.json` that actually contained Profile's fields) · 9 complete
Bootstrap/FontAwesome removal + dead-code elimination (deleted the 67-file legacy `widgets/` tree
and unregistered `admin/configuration`, `admin/docs`) · 10 chart layout, integer axis ticks, and
the Inter font finally wired up. Note phase 7 concluded Bootstrap _couldn't_ be removed; phase 9
superseded that and removed it.

**Generation 3 — BridgeCare restyle** (`web-layout-plan.md` phases 0–7): baseline + token spec ·
tokens and global chrome · **sidebar/topbar/tabbar shell, navbar deleted** · auth split-screen and
account sweep · dashboard stat/chart cards · care screens + entity/admin sweep · new features
(toasts, topbar CTA, messages, about) · cleanup, axe audit, docs. Ended at 323/323 Jest green with
0 axe violations.
