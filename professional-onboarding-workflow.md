# Professional onboarding workflow

## Scope and boundaries

This workflow onboards a healthcare professional from the natural JHipster `User` account registration and activation flow through verified, role-authorized professional access. It uses JHipster's existing account lifecycle for credentials; it does **not** create a separate plaintext `Credential` or password model.

Clinical reports remain separate from professional-registration documents. Professional duty rosters remain separate from the patient-scoped `Roster` entity described in the existing specification.

## Roles

| Role                                         | Responsibility                                                          |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| Applicant                                    | Supplies identity, contact, qualification, and registration evidence.   |
| Onboarding administrator                     | Reviews evidence, assigns the clinical authority, and activates access. |
| Credentialing reviewer                       | Verifies licensing, certificates, and identity documents.               |
| Identity provider / JHipster account service | Creates, activates, and authenticates the account.                      |
| Roster administrator                         | Assigns or approves duty-roster subscriptions after activation.         |

## Workflow

| Step                                                 | Owner                                    | Action                                                                                                                                                                                                                   | Exit criteria                                                                                     | Verification                                                                                                                                                    |
| ---------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Create JHipster account                           | Applicant or identity provider           | Use the standard JHipster registration or invitation flow to create the `User` account with login, email, and credential/SSO setup.                                                                                      | Unique pending account exists.                                                                    | Reject duplicate login or email; never create a parallel `Credential` or plaintext password record.                                                             |
| 2. Activate account                                  | Identity provider                        | Complete the standard JHipster activation challenge, password creation, or SSO confirmation.                                                                                                                             | Account is active and email ownership is confirmed.                                               | Verify one-time token use, expiry, MFA/password policy, and activation audit record.                                                                            |
| 3. Start professional application                    | Authenticated applicant or administrator | Create an application linked to the active account, capture consent, and show the profile-completion workflow.                                                                                                           | Unique professional application ID is linked to the account.                                      | An account without a complete profile cannot access professional features.                                                                                      |
| 4. Capture professional profile                      | Applicant                                | Collect first, middle, and last name; date of birth; sex; mobile phone; email; title/designation; identity type and number.                                                                                              | Required fields are valid and saved as a pending `Profile`.                                       | Validate required fields, email/phone format, supported identity type, and duplicate identity number.                                                           |
| 5. Capture address and contacts                      | Applicant                                | Collect digital/street address, town/district, city/state, region, country, and emergency contact/next of kin.                                                                                                           | Address is linked one-to-one to the pending profile; contact relationship is recorded.            | Confirm the canonical backend contact representation before implementation: current generated `Profile.contacts` is not yet the specified typed self-reference. |
| 6. Collect documents                                 | Applicant                                | Upload identity evidence plus required professional documents: certificate, license, passport/Ghana Card, photo, and any organization-specific evidence. Select document type; require an “Other” label when applicable. | Each required document has metadata, secure storage reference, checksum, uploader, and timestamp. | Enforce allowlisted types, size limits, malware/content scanning, and private object-storage access.                                                            |
| 7. Validate credentials                              | Credentialing reviewer                   | Review identity and qualifications, verify license/certificate issuer and expiry, and record outcome/reason.                                                                                                             | Application is `approved`, `rejected`, or `returned-for-correction`.                              | Approval requires all mandatory evidence; rejection/correction requires a reviewer reason and audit record.                                                     |
| 8. Assign organization context                       | Onboarding administrator                 | Associate the approved professional with team, category/specialty, membership/organization, and supervisor as applicable.                                                                                                | Required organizational relationships are assigned.                                               | Resolve the existing `Category` relationship and account/profile linkage before API implementation.                                                             |
| 9. Assign authority and activate professional access | Onboarding administrator                 | Assign exactly the approved clinical authority: `ROLE_DOCTOR`, `ROLE_NURSE`, `ROLE_PARAMEDIC`, `ROLE_PHARMACIST`, `ROLE_THERAPIST`, or `ROLE_CARER`; retain `ROLE_ADMIN`/`ROLE_USER` only when applicable.               | Server-side authority assignment is complete and audited; professional features are enabled.      | Backend authorization, not frontend checks, enforces the approved mutation matrix.                                                                              |
| 10. Configure duty roster                            | Roster administrator and professional    | Present eligible professional `DutyRoster` subscriptions; assign shifts or allow subscription according to policy.                                                                                                       | Active/next shift is available or an explicit “not assigned” state is recorded.                   | Do not reuse patient-scoped `Roster`; require a dedicated professional duty-roster API.                                                                         |
| 11. First-login orientation                          | Professional                             | Show role badge, privacy/confidentiality acknowledgement, profile completeness, duty status, and allowed actions.                                                                                                        | Professional accepts required policy acknowledgements and reaches dashboard.                      | Verify least-privilege UI and server API access for the assigned authority.                                                                                     |
| 12. Ongoing compliance                               | Credentialing reviewer and scheduler     | Monitor document/license expiry, authority changes, roster changes, and deactivation.                                                                                                                                    | Expiring/revoked credentials trigger review, restriction, or deactivation.                        | Alerts, audit history, and access revocation are tested end-to-end.                                                                                             |

## Status model

`account_created -> account_activated -> application_started -> profile_completed -> credential_review -> returned_for_correction | rejected | approved -> organization_assigned -> authority_assigned -> roster_configured -> active`

`suspended`, `expired`, and `deactivated` may be entered from any active state. Every transition needs actor, timestamp, reason, and immutable audit history.

## Implementation work packages

1. **Integrate the account-first flow.** Reuse JHipster registration, activation, account recovery, and authenticated-account identity before creating a professional application.
2. **Confirm data contracts.** Finalize account-to-profile linkage; typed contacts; Category/Team/Membership semantics; document storage and verification metadata; professional duty-roster API; custom authority provisioning.
3. **Add onboarding state and APIs.** Model application/status transitions, reviewer decisions, document requirements, and audit events. Enforce server-side role checks and validation.
4. **Build applicant flow.** Implement the authenticated profile/address/contact forms, resumable document uploads, and correction handling.
5. **Build reviewer/admin flow.** Implement review queue, secure document preview, approval/rejection/correction, organizational assignment, authority assignment, and professional-access enablement.
6. **Build roster/first-login flow.** Implement professional duty-roster subscription/assignment and first-login acknowledgement.
7. **Test and operate.** Add unit, API/integration, authorization, upload-security, audit, accessibility, and end-to-end tests; add expiry monitoring and operational dashboards.

## Required decisions before implementation

- Whether enrollment is invitation-only, self-service, or both.
- Mandatory document types by clinical role and jurisdiction, including license expiry rules.
- Identity-verification provider and manual-review policy.
- Exact `Category`, Team, Membership, and supervisor relationships.
- Account/Profile identifier and lifecycle ownership.
- MFA, SSO, password, consent-retention, and data-deletion policies.
- Duty-roster subscription versus administrator assignment policy.
