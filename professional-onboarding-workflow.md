# Professional onboarding workflow

> **Status: implementation-ready.** Reviewed against the actual codebase (`gateway/`, `api/`, `web/`) on 2026-07-27; all previously open questions are resolved in § Decisions and § Data contracts. Findings that contradict earlier assumptions are marked **[reality]**.

## Scope and boundaries

This workflow onboards a healthcare professional from the natural JHipster `User` account registration and activation flow through verified, role-authorized professional access. It uses JHipster's existing account lifecycle for credentials; it does **not** create a separate plaintext `Credential` or password model.

Clinical reports remain separate from professional-registration documents. Professional duty rosters remain separate from patient care scheduling.

## Decisions (owner-confirmed, 2026-07-27)

| Decision            | Choice                                                                                                                                                                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enrollment mode     | **Both**: self-service registration stays open (as today) **and** administrators can invite. Both paths converge on the same application + review pipeline.                                                                                          |
| Clinical role set   | **All backend roles**: Doctor, Nurse, Paramedic, Pharmacist, Therapist, Carer, Angel, Chemist, Technician. Requires adding `ROLE_THERAPIST` to the gateway and Angel/Chemist/Technician to the web `AuthorityRole` model (see § Data contracts).     |
| Document storage    | **MongoDB binary** — keep `IPersonalDocumentdata: byte[]`, extended with checksum/verification/expiry metadata, allowlisted content types, and size limits. Revisit object storage only if volumes demand it.                                        |
| Duty-roster policy  | **Admin assignment only.** Roster administrators assign shifts; professionals see their roster read-only. The current web subscribe/unsubscribe buttons become roster-admin-only affordances.                                                        |
| Admin-portal events | **Kafka domain events**: registrations publish `registration.created` (gateway) and entity creation publishes `entity.created` (api). The admin portal (sibling `hc-admin` workspace) subscribes for relevant updates — contract in § Domain events. |

### Adopted defaults (changeable later; flag before building against them)

- **Mandatory documents (all clinical roles):** professional certificate, license (with expiry), one government identity document (`PASSPORT` / `GHANACARD` / `DRIVERLICENSE` / `VOTERCARD`), and a passport photo (`PASSPHOTO`). Role- or jurisdiction-specific additions ride the `OTHER` type with a required label until a per-role matrix is needed.
- **Identity verification:** manual credentialing review (no external verification provider in v1).
- **MFA / SSO:** out of scope for v1 — JHipster JWT with password policy as-is. Consent acknowledgements are stored as audit events; data-deletion/retention policy handling is deferred.
- **Membership/organization entity:** deferred — no `Membership` entity exists in `api/` **[reality]**; organization context in v1 is Category (specialty) + Team + supervisor.

## Roles

| Role                                         | Responsibility                                                          |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| Applicant                                    | Supplies identity, contact, qualification, and registration evidence.   |
| Onboarding administrator                     | Reviews evidence, assigns the clinical authority, and activates access. |
| Credentialing reviewer                       | Verifies licensing, certificates, and identity documents.               |
| Identity provider / JHipster account service | Creates, activates, and authenticates the account (`gateway/`).         |
| Roster administrator                         | Assigns duty-roster shifts after activation (assignment-only policy).   |

## Data contracts (grounded in current code)

### Account ↔ Profile linkage

- `Profile.accountId` already exists in `api/` **[reality]**. Canonical value: the gateway `User.id` (stable even if login is edited in user management). Denormalize `login` onto the application record for display/search only.
- One active `Profile` per account, enforced by a unique index on `accountId`.

### Profile (extend existing `net.jojoaddison.domain.Profile`)

Current fields **[reality]**: `accountId`, `firstName`, `middleNames`, `lastName`, `birthDate`, `sex`, `mobilePhone`, `phoneNumber`, `email`, `cardType`, `cardNumber`, embedded `Address address`. There is **no** `contacts` field today — the earlier "typed self-reference" concern is moot.

Additions:

- `title` (designation, e.g. "Dr", "RN").
- `emergencyContact` — **embedded** `{ name, relationship, phone }` (matches the shape the web UI already renders; no self-referencing Profile link).
- `specialtyCategoryId` — reference to the existing `Category` lookup (flat `name`/`description` entity **[reality]**; used as specialty taxonomy).
- `teamIds: List<String>` — references to `Team`. Normalize `Team.members` from its current free-string **[reality]** to a list of profile ids; `Team.supervisor` holds a profile id.
- Identity fields: keep `cardType`/`cardNumber` as the identity-document type + number (aligned with `DocumentType` values).

### Documents (extend existing `PersonalDocument`)

Current **[reality]**: `name`, `profileId`, `data: byte[]` (Mongo-resident), `dataContentType`, `type: DocumentType (PASSPORT, CERTIFICATE, GHANACARD, PASSPHOTO, DRIVERLICENSE, VOTERCARD, NHIS, OTHER, …)`, created/modified audit fields.

Additions: `sha256Checksum`, `sizeBytes`, `otherLabel` (required when `type == OTHER`), `expiryDate` (required for licenses), `verificationStatus (PENDING | VERIFIED | REJECTED)`, `verifiedBy`, `verifiedAt`, `rejectionReason`. Upload validation: allowlist `application/pdf`, `image/png`, `image/jpeg`; max 5 MB (mirrors the web `file-upload-trigger` default); reject mismatched content-type vs magic bytes. Endpoints stream bytes with authorization checks — never expose documents through unauthenticated URLs.

### Professional application (new entity in `api/`)

`ProfessionalApplication { id, accountId, login (denormalized), profileId, requestedRole, status, consentAcceptedAt, invitedBy?, submittedAt, decidedBy?, decidedAt?, decisionReason?, correctionNotes? }` plus an append-only `OnboardingEvent { applicationId, actor, fromStatus, toStatus, reason, at }` collection for the immutable audit history. No status change without a written event.

### Domain events (Kafka) — admin-portal integration

**[reality]** Both this workspace and `hc-admin` currently carry only the JHipster Kafka scaffold (dummy `Supplier` producer, `sse-topic`, `text/plain`, `function.definition` commented out) — there are no established topic conventions to inherit, so this contract is authoritative. Publishing uses Spring Cloud Stream's `StreamBridge` (JSON), not the scaffold supplier.

**Topics** (shared dev broker `localhost:9092`; `auto-create-topics` is on):

| Topic                          | Producer   | v1 event types         |
| ------------------------------ | ---------- | ---------------------- |
| `hc.professional.registration` | `gateway/` | `registration.created` |
| `hc.professional.entity`       | `api/`     | `entity.created`       |

**Envelope** (`content-type: application/json`; record key = `accountId` for registration events, `entityId` for entity events, so per-subject ordering holds):

```json
{
  "eventId": "<uuid>",
  "eventType": "registration.created | entity.created",
  "occurredAt": "<ISO-8601 instant>",
  "source": "hc-professional-gateway | hc-professional-service",
  "actor": "<login or system>",
  "payload": {}
}
```

- `registration.created` payload: `{ accountId, login, email, langKey, origin: "self-service" | "invitation" }`. Published by the gateway after a successful `registerAccount` (and after invitation-created accounts in WP3).
- `entity.created` payload: `{ entityType, entityId, accountId? }` where `entityType` ∈ `Profile | ProfessionalApplication | PersonalDocument | DutyRoster | Team | Category | Activity | Report | Task | Roster | Metadata | Address`. Published by the api service from every entity create path via a single `DomainEventPublisher`. **PII minimization:** events carry identifiers only — never document bytes, names, or contact details; the admin portal fetches details through authorized REST calls.

**Consumption:** the admin portal subscribes with its own consumer group (e.g. `hc-admin-ms`). Delivery is at-least-once — consumers must dedupe on `eventId`. The consumer implementation lives in the `hc-admin` workspace and is out of scope here; this section is the contract it codes against.

### Authorities — cross-stack alignment (prerequisite work) **[reality]**

| Location                                                                  | Today                                                                                                                  | Required change                                                                                              |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `gateway/` `AuthoritiesConstants`                                         | has DOCTOR, NURSE, ANGEL, CARER, PARAMEDIC, PHARMACIST, CHEMIST, TECHNICIAN — **missing THERAPIST**                    | add `ROLE_THERAPIST`                                                                                         |
| `gateway/` `InitialSetupMigration`                                        | seeds authorities only for doctor/nurse/angel/carer/paramedic demo users                                               | seed **all nine** clinical authorities (+ existing admin/user)                                               |
| `api/` `AuthoritiesConstants`                                             | only ADMIN, USER, PATIENT, ANGEL, ANONYMOUS — **no clinical roles** → server-side role checks are currently impossible | add all nine clinical constants; use them in `@PreAuthorize`/`SecurityConfiguration` for the mutation matrix |
| `web/` `AuthorityRole` + `healthConnect.roles.*` i18n + permission matrix | six roles (Doctor, Nurse, Paramedic, Pharmacist, Therapist, Carer)                                                     | add Angel, Chemist, Technician (roles, badges, i18n en/fr/de, `hasHealthConnectPermission` rows)             |

Authority assignment happens **only** in the gateway's user-management API, driven by the application decision; the api service enforces per-endpoint authorization with its own constants.

### Duty roster **[reality]**

`api/.jhipster/DutyRoster.json` exists but the entity was never generated. Generate it with two corrections first: **drop the `patientId` field** (violates the separation rule in § Scope) and align the `DutyRole` enum (currently `DOCTOR,NURSE,CARER,MEDIC,THERAPIST,VENDOR,TECHNICIAN,ADMINISTRATOR,OTHER`) with the nine onboarding roles — rename `MEDIC`→`PARAMEDIC`, add `PHARMACIST`, `ANGEL`, `CHEMIST`; keep `OTHER`. `ShiftType (MORNING, AFTERNOON, NIGHT)` stands. The legacy `Roster` entity remains untouched for its current purpose. The web `duty-roster-api` adapter maps this contract onto the existing page model; per the assignment-only decision, subscribe/unsubscribe actions are exposed only to roster administrators.

## Workflow

| Step                                                 | Owner                                    | Action                                                                                                                                                            | Exit criteria                                                                                                          | Verification                                                                                                                               |
| ---------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Create JHipster account                           | Applicant or identity provider           | Standard JHipster registration (self-service) **or** administrator invitation; either creates the `User` account with login + email.                              | Unique pending account exists.                                                                                         | Reject duplicate login or email; never create a parallel credential/password record.                                                       |
| 2. Activate account                                  | Identity provider                        | Standard JHipster activation (one-time key) or invited-user password setup.                                                                                       | Account active; email ownership confirmed.                                                                             | One-time token use, expiry, password policy, activation audit record.                                                                      |
| 3. Start professional application                    | Authenticated applicant or administrator | Create `ProfessionalApplication` linked via `accountId`; capture consent acknowledgement; route the user into the profile-completion flow.                        | Unique application exists per account (`status = application_started`).                                                | An account without an approved application gets no clinical authority and no professional features.                                        |
| 4. Capture professional profile                      | Applicant                                | Names, date of birth, sex, mobile phone, email, title/designation, identity type + number.                                                                        | Valid pending `Profile` saved with `accountId` set.                                                                    | Field validation; supported identity type; duplicate `cardNumber` check per identity type.                                                 |
| 5. Capture address and emergency contact             | Applicant                                | Digital/street address, town/district, city/state, region, country (embedded `Address`); emergency contact `{name, relationship, phone}` (embedded).              | Address + emergency contact stored on the pending profile.                                                             | Contract per § Data contracts — embedded, not entity links.                                                                                |
| 6. Collect documents                                 | Applicant                                | Upload the mandatory set (certificate, license with expiry, government ID, passport photo) + optional `OTHER` items with labels.                                  | Every required document stored with checksum, size, content type, uploader, timestamp; `verificationStatus = PENDING`. | Allowlisted types, 5 MB limit, magic-byte check, authorized streaming only (Mongo-resident binary per decision).                           |
| 7. Validate credentials                              | Credentialing reviewer                   | Review identity + qualifications; verify issuer and expiry per document; record per-document verdicts and an application decision.                                | Application `approved`, `rejected`, or `returned_for_correction`.                                                      | Approval requires every mandatory document `VERIFIED`; rejection/correction requires reason; all transitions logged as `OnboardingEvent`s. |
| 8. Assign organization context                       | Onboarding administrator                 | Set `specialtyCategoryId`, team membership(s), and supervisor on the approved profile.                                                                            | Required organizational relationships assigned.                                                                        | Category = existing flat lookup; `Team.members` normalized to profile-id list; Membership deferred (see defaults).                         |
| 9. Assign authority and activate professional access | Onboarding administrator                 | Assign exactly the approved clinical authority (one of the nine roles) via the gateway user-management API; retain `ROLE_ADMIN`/`ROLE_USER` only when applicable. | Server-side authority assigned and audited; professional features enabled.                                             | Gateway assigns; **api enforces** via its (newly added) clinical `AuthoritiesConstants` — frontend checks are cosmetic only.               |
| 10. Configure duty roster                            | Roster administrator                     | Assign shifts on the (newly generated) `DutyRoster` entity for the professional.                                                                                  | Active/next shift exists **or** an explicit "not assigned" state is shown.                                             | Assignment-only policy: professionals read their roster; no self-subscription. `patientId` removed from the contract.                      |
| 11. First-login orientation                          | Professional                             | Show role badge, privacy/confidentiality acknowledgement, profile completeness, duty status, allowed actions.                                                     | Required acknowledgements accepted (stored as `OnboardingEvent`s); professional reaches dashboard.                     | Least-privilege check: UI affordances and API responses match the assigned authority exactly.                                              |
| 12. Ongoing compliance                               | Credentialing reviewer and scheduler     | MonitPersonalDocumente/document expiry (from `PersonalDocument.expiryDate`), authority changes, roster changes, deactivation.                                     | Expiring/revoked credentials trigger review, restriction, or deactivation.                                             | Scheduled expiry sweep + alerts; access revocation and audit history tested end-to-end.                                                    |

## Status model

`account_created -> account_activated -> application_started -> profile_completed -> credential_review -> returned_for_correction | rejected | approved -> organization_assigned -> authority_assigned -> roster_configured -> active`

`returned_for_correction` loops back to the step named in the correction notes (profile, address, or documents) and re-enters `credential_review` on resubmission. `suspended`, `expired`, and `deactivated` may be entered from any post-approval state. Every transition is an `OnboardingEvent` with actor, timestamp, and reason; the event log is append-only.

## Implementation work packages (ordered; repo-mapped)

1. **WP1 — Authority alignment (`gateway/`, `api/`, `web/`).** Add `ROLE_THERAPIST` to the gateway; seed all nine clinical authorities; add clinical constants to `api/` and wire `@PreAuthorize`/security config for the mutation matrix; extend web `AuthorityRole`, role badges, i18n, and `hasHealthConnectPermission` with Angel/Chemist/Technician. _Gate:_ authority round-trip test — gateway-assigned role reaches api claims and web badge.
2. **WP2 — Data contracts (`api/`).** Extend `Profile` (title, embedded emergency contact, `specialtyCategoryId`, `teamIds`; unique `accountId` index); extend `PersonalDocument` (checksum, size, `otherLabel`, `expiryDate`, verification fields); normalize `Team.members`; new `ProfessionalApplication` + `OnboardingEvent` collections. _Gate:_ `*ResourceIT` Testcontainers coverage for every new/changed contract.
3. **WP3 — Onboarding state machine, APIs + domain events (`api/`, `gateway/`).** Application lifecycle endpoints (create/submit/decide/correct), document upload/stream endpoints with the § Documents validation, invitation endpoint in the gateway (creates a pre-activated `User` + emails the activation link), server-side transition guards writing `OnboardingEvent`s. Kafka publishing per § Domain events: `registration.created` from the gateway registration/invitation paths, `entity.created` from a shared `DomainEventPublisher` on every api create path (replaces the scaffold `Supplier` producers; JSON envelope via `StreamBridge`). _Gate:_ every illegal transition rejected server-side with an IT proving it, plus Testcontainers-Kafka ITs asserting both event types land on their topics with the documented envelope and no PII beyond identifiers.
4. **WP4 — Applicant flow (`web/`).** Authenticated application wizard (consent → profile → address/contact → documents → submit), resumable uploads via the existing `file-upload-trigger`, correction handling (re-open only the flagged step), application-status page. BridgeCare components (`.hpd-btn*`, `.hpd-input`, panels) throughout; i18n en/fr/de. _Gate:_ Jest specs per step + status-driven routing spec.
5. **WP5 — Reviewer/admin flow (`web/`, `api/`).** Review queue (data-table with status tints), secure document preview (authorized streaming), per-document verify/reject, application approve/reject/return, organization assignment, authority assignment (gateway call), professional-access enablement. _Gate:_ role-gated e2e-style spec — reviewer vs admin vs applicant see disjoint affordances.
6. **WP6 — Duty roster + first login (`api/`, `web/`).** Generate the corrected `DutyRoster` entity (drop `patientId`, aligned enum); assignment-only admin UI; professional read-only roster view (swap the current mock repository path for the real API adapter); first-login acknowledgement interstitial writing `OnboardingEvent`s. _Gate:_ shift label in the sidebar user card driven by real assignments.
7. **WP7 — Compliance + operations.** Scheduled expiry sweep over `PersonalDocument.expiryDate` (api scheduler + Kafka event or email hook), restriction/deactivation path, audit-history viewer for admins, operational dashboard tiles. _Gate:_ end-to-end test: expiring license → review task → restriction → reactivation after new document.

## Branch plan (staged 2026-07-27)

One branch per work package in each repo it touches, named `onboarding/wp<N>-<slug>`. Bases: `web/` and `api/` branch from `main`; `gateway/` branches from **`feature/sb4-upgrade`** (the active Spring Boot 4 line, 4 commits ahead of its `main`). Branches are staged up front from today's HEADs — **rebase each branch onto the merged result of its predecessor before starting work on it** (WP order is dependency order).

| WP  | Branch                                   | gateway | api | web |
| --- | ---------------------------------------- | :-----: | :-: | :-: |
| WP1 | `onboarding/wp1-authorities`             |   ✔    | ✔  | ✔  |
| WP2 | `onboarding/wp2-data-contracts`          |         | ✔  |     |
| WP3 | `onboarding/wp3-state-machine-events`    |   ✔    | ✔  |     |
| WP4 | `onboarding/wp4-applicant-flow`          |         |     | ✔  |
| WP5 | `onboarding/wp5-reviewer-admin-flow`     |         | ✔  | ✔  |
| WP6 | `onboarding/wp6-duty-roster-first-login` |         | ✔  | ✔  |
| WP7 | `onboarding/wp7-compliance-ops`          |         | ✔  | ✔  |

Merge discipline: a WP merges to its repo's base branch only when its gate (§ Implementation work packages) is green; cross-repo WPs (1, 3, 5, 6, 7) merge together or not at all.

### WP status log

**WP4 — done (2026-07-29), pending merge review** (`web` branch `onboarding/wp4-applicant-flow`, based on WP1; consumes the WP3 api surface).

- Status-driven applicant wizard at `/onboarding` (authenticated-only route — no clinical role, since applicants hold `ROLE_USER`): consent + requested role (all nine) → profile → address & emergency contact → documents → review/submit → status timeline from the audit events. Corrections re-open editable steps with the reviewer's notes; the wizard locks during review.
- Documents step computes the mandatory checklist (certificate / license-with-expiry / government ID / passport photo) from actual uploads and gates review on completeness; uploads go through the shared `file-upload-trigger` with the same limits the server enforces.
- `OnboardingApiService` wraps the WP3 surface; sidebar Account entry, BridgeCare components, i18n en/fr/de, toasts.
- **WP3 addenda this forced on `api/`** (committed on the wp3 branch): `PUT/GET /api/onboarding/profile` (applicants can't pass the WP1 mutation matrix to reach `/api/profiles`; upsert forces `accountId` to the caller and the GET enables prefill since upsert overwrites all fields) and `GET /api/onboarding/documents` (own uploads, bytes stripped). `OnboardingFlowIT` extended to 8/8.
- Gate: service HTTP-contract spec + page spec covering the status→step mapping (7 statuses), consent guard, profile persistence + complete-profile transition, checklist computation, upload metadata, and submit flow. Web suite 347/347, lint + prod build green.

**WP3 — done (2026-07-28), pending merge review** (`api` + `gateway` branches `onboarding/wp3-state-machine-events`, based on WP2 / WP1 respectively).

- **State machine (`api/`):** `OnboardingService` enforces the § Status model transition map server-side; every transition appends an `OnboardingEvent`; illegal transitions → 409. Applicant endpoints under `/api/onboarding` (start with consent guard, complete-profile, submit gated on the mandatory document set) plus admin-only decide/organization/authority-assigned/roster-configured/activate/suspend/deactivate. Approval requires every uploaded document `VERIFIED`; rejection/correction requires a reviewer reason. `/api/onboarding/**` is open to authenticated users (applicants hold only ROLE_USER pre-assignment); decisions use method security.
- **Documents (`api/`):** multipart upload with the § Documents validation (pdf/png/jpeg allowlist, 5 MB, magic-byte check, `OTHER` label rule, license-expiry rule), sha256/size/PENDING recorded, bytes never echoed; authorized streaming (owner or admin). `LICENSE` added to `DocumentType`.
- **Domain events:** api `DomainEventPublisher` → `hc.professional.entity` wired into all ten generated create endpoints + onboarding creates; gateway `RegistrationEventPublisher` → `hc.professional.registration` fired from self-service registration and admin (invitation) user creation. Both keyed per contract; failures logged, never propagated. ArchUnit forced a clean shape: broker classes take primitives and the caller supplies the actor (no domain/security access from the broker layer).
- **Gates:** `OnboardingFlowIT` (legal path end-to-end, illegal-transition 409s, all guards, audit trail) and `DomainEventsKafkaIT` (Testcontainers Kafka: documented envelope on the real topic, keyed by entityId, PII-free payload) — api full verify **190/190**. Gateway: `RegistrationEventPublisherTest` (envelope, origins, key, failure isolation) — 29/29.
- Deviations recorded: no separate invitation endpoint (JHipster admin user creation _is_ the invitation flow — pre-activated user + emailed activation link, publishing `origin=invitation`); the scaffold Kafka `Supplier`/`Consumer` classes were left dormant rather than deleted (their function bindings were already commented out); `accountId` carries the gateway login until a uid claim is added to the JWT (noted in WP2 contracts as well).

**WP2 — done (2026-07-28), pending merge review** (`api` branch `onboarding/wp2-data-contracts`, based on WP1).

- `Profile` extended: `title`, embedded `EmergencyContact {name, relationship, phone}`, `specialtyCategoryId`, `teamIds`; unique **sparse** index on `account_id` (created at startup by a new `ApplicationRunner` in `DatabaseConfiguration` — auto-index-creation is off).
- `PersonalDocument` extended: `sha256Checksum`, `sizeBytes`, `otherLabel`, `expiryDate`, `verificationStatus (PENDING|VERIFIED|REJECTED)` + `verifiedBy/verifiedAt/rejectionReason` (new `VerificationStatus` enum).
- `Team.members` normalized from a free string to a list of profile ids.
- New collections: `ProfessionalApplication` (unique per account, `findByAccountId`) and append-only `OnboardingEvent` (`findByApplicationIdOrderByAtAsc`), with the new `OnboardingStatus` enum covering the § Status model states.
- Gate: `OnboardingContractsIT` (REST round-trip of the Profile extensions, unique-index enforcement for Profile and application, document verification metadata, chronological event trail) + updated `TeamResourceIT`/`TeamTestSamples`. Full `./mvnw verify` green.
- Notes: `.jhipster/*.json` intentionally not updated — JDL cannot express embedded objects or `List<String>`; the domain classes remain the contract source of truth (needles preserved). Spring Framework 7 test quirk found: `jsonPath().value(List)` maps arrays through Jackson 3 and yields null — use Hamcrest `contains`/`hasItem` for array assertions.

**WP1 — done (2026-07-27), pending merge review.**

- `gateway/`: `ROLE_THERAPIST` added; `InitialSetupMigration` now seeds all nine clinical authorities with demo professionals (pharmacist, therapist, chemist, technician added). 26/26 tests green.
- `api/`: all nine clinical constants added (extending the owner's PATIENT/ANGEL work); route-level mutation matrix in `SecurityConfiguration` — GET `/api/**` for any authenticated role, POST/PUT/PATCH/DELETE restricted to `CLINICAL_MUTATION` (admin, doctor, nurse, paramedic, pharmacist, therapist; carer/angel/chemist/technician read-only in v1). New `ClinicalAuthorityMatrixIT` proves the split per role. Generated ITs now run as `ROLE_DOCTOR`.
- `api/` test harness: **first green integration-test run on the Spring Boot 4 line — 178/178.** Five upgrade breakages fixed along the way (commons-io, stale `spring.jackson` keys, missing Jackson 2 mapper for generated ITs, `spring.mongodb.uri` rename, and the missing `spring-boot-security-test` module that made `@WithMockUser` a no-op → universal 401s).
- `web/`: Angel/Chemist/Technician added to `Authority`, `AuthorityRole`, precedence, role badges (i18n en/fr/de), and the clinician route guard; mutation matrix unchanged (new roles read-only, matching the api). 324/324 tests green.
- Gate: enforced server-side and covered by `ClinicalAuthorityMatrixIT` (api), seeder + constants (gateway), and role-resolution specs (web). A live token round-trip through all three services awaits the next dev-stack restart — worth a manual smoke before merging.

## Superseded questions (kept for the record)

The former "Required decisions before implementation" list is fully resolved: enrollment mode, role set, document storage, and roster policy by owner decision (§ Decisions); contact representation, Category/Team/supervisor semantics, account/profile linkage, and the duty-roster API by the code-grounded contracts (§ Data contracts); document matrix, verification provider, MFA/SSO/consent, and Membership scope by the adopted defaults.
