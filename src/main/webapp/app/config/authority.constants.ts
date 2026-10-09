/**
 * The authorities this portal knows: the eight clinical disciplines, the administrator, and the base
 * role every account holds.
 *
 * <p>`ROLE_ANGEL` was a ninth discipline here until 2026-09-08 and is deliberately absent
 * (`../docs/backlog.md` item 44). A care angel supports one named patient; hc-patient owns the
 * authority — an `ACTIVE CareDelegation` re-read per request — and the whole surface for it, and
 * `professional.abofonsa.com` is not where an angel belongs. Nothing in this stack names the concept
 * any more: the gateway does not seed it, the service does not admit it, and this enum does not badge
 * it.
 *
 * <p>Two things follow from that and are load-bearing. **An account may still hold the authority** —
 * hc-patient issues it, all three gateways share one signing key, and a long-lived database may carry
 * a grant made before the removal — so `resolveAuthorityRole` must treat `ROLE_ANGEL` the way it
 * treats any string it does not recognise, which is as *not a clinician* rather than as an unknown to
 * be waved through. And **`KNOWN_TRACKS` in `core/careers/careers-handoff.service.ts` is derived from
 * this enum**, so `?track=ROLE_ANGEL` from the careers site is now dropped in silence, which is what
 * the handoff contract requires of any value outside the known set.
 */
export enum Authority {
  DOCTOR = 'ROLE_DOCTOR',
  NURSE = 'ROLE_NURSE',
  PARAMEDIC = 'ROLE_PARAMEDIC',
  PHARMACIST = 'ROLE_PHARMACIST',
  THERAPIST = 'ROLE_THERAPIST',
  CARER = 'ROLE_CARER',
  CHEMIST = 'ROLE_CHEMIST',
  TECHNICIAN = 'ROLE_TECHNICIAN',
  ADMIN = 'ROLE_ADMIN',
  USER = 'ROLE_USER',
}

/**
 * The eight career authorities: every member of {@link Authority} a professional can *apply to be*.
 *
 * <p>`ROLE_ADMIN` is a back-office grant and `ROLE_USER` is the base role every account already
 * holds, so neither is a career anybody requests — which makes "the eight" a subtraction of exactly
 * those two from the enum, and never a list.
 *
 * <p><b>Why this lives here and not beside the screen that needs it.</b> Two places in this app need
 * the same eight: `core/careers/careers-handoff.service.ts`, which validates an inbound
 * `?track=<AuthorityRole>` from `web.abofonsa.com/careers`, and `account/user/authority.enum.ts`,
 * which is step 1's role dropdown. Those are the *first* two — the eight are a documented cross-repo
 * invariant with copies in `gateway/security/AuthoritiesConstants`,
 * `api/security/AuthoritiesConstants`, `health-connect/authority-role.ts` and `mobile/`'s
 * `core/auth/clinical-permissions.ts` — and **two sources for one list is how `ROLE_ANGEL` took four
 * repositories and five files to remove** (`../../../docs/backlog.md` item 44). One derivation, two
 * importers.
 *
 * <p><b>A subtraction here and an explicit list in `health-connect/authority-role.ts`, deliberately,
 * and the difference is not inconsistency.</b> `CLINICAL_ROLES` there is written out because item 149
 * showed a subtraction answering the wrong number: that list feeds a *count the sign-in page
 * advertises*, so being silently wrong is the whole failure mode, and an explicit list can only be
 * incomplete rather than wrong. This list feeds a *validator and a dropdown*, where the failure mode
 * inverts — a discipline added to `Authority` and forgotten here is a role nobody can apply for, with
 * nothing to notice it. A subtraction absorbs the ninth discipline automatically, which is the
 * behaviour wanted on this side.
 *
 * @see ../account/user/authority.enum.spec.ts, which holds this to the enum
 */
export type CareerAuthority = Exclude<Authority, Authority.ADMIN | Authority.USER>;

export const CAREER_AUTHORITIES: readonly CareerAuthority[] = Object.values(Authority).filter(
  (authority): authority is CareerAuthority => authority !== Authority.ADMIN && authority !== Authority.USER,
);
