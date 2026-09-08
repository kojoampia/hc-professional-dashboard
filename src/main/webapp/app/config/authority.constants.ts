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
