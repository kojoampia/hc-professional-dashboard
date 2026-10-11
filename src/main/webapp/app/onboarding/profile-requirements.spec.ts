import { ONBOARDING_REQUIREMENT_KEYS, OnboardingRequirementKey } from 'app/health-connect/api/onboarding-api.service';
import {
  ADDRESS_FIELDS,
  CONTACT_FIELDS,
  PROFILE_FIELDS_FROM_THE_ACCOUNT,
  PROFILE_FIELDS_ON_THIS_FORM,
  PROFILE_FIELDS_WITH_NO_INPUT,
  REQUIREMENT_FOR_GROUP,
  REQUIRED_CONTROLS,
  WIRE_MODEL_GAP,
  provided,
} from './profile-requirements';

/**
 * The step-2 requirement data — `backlog.md` row 230, unit B.
 *
 * <p>⚠ **The exhaustiveness of the partition is NOT asserted here**, and deliberately: it is a *type*
 * in `profile-requirements.ts`, checked by `tsc` and `npx ng build`. A runtime spec could not see a
 * field added to `OnboardingProfileDto`, because a TypeScript interface does not exist at runtime —
 * which is the whole reason that guard is a compile-time one. What is left for a spec is the
 * arithmetic, the grouping, and the one predicate.
 */
describe('profile requirements', () => {
  /**
   * ⭐ **The documented gap, asserted rather than asserted-in-prose.**
   *
   * <p>`WIRE_MODEL_GAP` records that the server requires 39 values and this wire model can express 19.
   * Those numbers are the kind of claim that rots silently — somebody adds a field, the prose keeps
   * saying 19, and a reader is misled about whether this form validates everything. So the arithmetic
   * is derived from the arrays and the two must agree.
   */
  it('should account for every value the server requires, as either expressible here or absent', () => {
    const expressible =
      PROFILE_FIELDS_ON_THIS_FORM.length +
      PROFILE_FIELDS_FROM_THE_ACCOUNT.length +
      PROFILE_FIELDS_WITH_NO_INPUT.length +
      ADDRESS_FIELDS.length +
      CONTACT_FIELDS.length;

    expect(expressible).toBe(WIRE_MODEL_GAP.expressibleHere);

    // 39 = 10 Profile + 7 Address + 11 per contact x 2 contacts (ProfileCompleteness's own table).
    expect(WIRE_MODEL_GAP.serverRequiredValues).toBe(10 + 7 + 11 * 2);
    // What is left over is T6's, and every item of it is named rather than counted silently.
    expect(WIRE_MODEL_GAP.serverRequiredValues - WIRE_MODEL_GAP.expressibleHere).toBe(20);
    expect(WIRE_MODEL_GAP.absent).toHaveLength(4);
  });

  /**
   * ⛔ The three partitions must not overlap: a field in two of them would be both required and
   * deliberately-not-required, and which won would depend on array order.
   */
  it('should place each profile field in exactly one partition', () => {
    const all = [...PROFILE_FIELDS_ON_THIS_FORM, ...PROFILE_FIELDS_FROM_THE_ACCOUNT, ...PROFILE_FIELDS_WITH_NO_INPUT];

    expect(new Set(all).size).toBe(all.length);
  });

  /** Only the fields this form has inputs for become required controls. */
  it('should require the form-owned profile fields and both nested models, and nothing else', () => {
    expect(REQUIRED_CONTROLS.map(control => control.field)).toEqual([...PROFILE_FIELDS_ON_THIS_FORM, ...ADDRESS_FIELDS, ...CONTACT_FIELDS]);

    for (const field of [...PROFILE_FIELDS_FROM_THE_ACCOUNT, ...PROFILE_FIELDS_WITH_NO_INPUT]) {
      expect(REQUIRED_CONTROLS.map(control => control.field)).not.toContain(field);
    }
  });

  /**
   * The grouping is the server's three-key one. Spelled against the shared vocabulary so a key renamed
   * in `ONBOARDING_REQUIREMENT_KEYS` cannot leave this file naming something no catalogue has a label
   * for — which would render as the raw key, mid-screen, with nothing thrown.
   */
  it('should map every group to a requirement key the shared vocabulary carries', () => {
    const keys: OnboardingRequirementKey[] = Object.values(REQUIREMENT_FOR_GROUP);

    expect(keys).toEqual(['profile', 'address', 'nextOfKin']);
    for (const key of keys) {
      expect(ONBOARDING_REQUIREMENT_KEYS).toContain(key);
    }
  });

  it('should give every required control a group that has a requirement', () => {
    for (const control of REQUIRED_CONTROLS) {
      expect(REQUIREMENT_FOR_GROUP[control.group]).toBeDefined();
    }
  });

  describe('provided', () => {
    /**
     * ⚠ The blank-string case is the one that matters: *"a blank string is what an untouched input
     * posts, and counting it would make the whole predicate satisfiable by submitting an empty form"*
     * — `ProfileCompleteness.hasText`, whose reading this mirrors.
     */
    it('should refuse an empty or whitespace-only string', () => {
      expect(provided('')).toBe(false);
      expect(provided('   ')).toBe(false);
      expect(provided('\t\n')).toBe(false);
    });

    it('should accept a non-blank string', () => {
      expect(provided('Accra')).toBe(true);
      expect(provided('0')).toBe(true);
    });

    /** Enums and dates arrive as values rather than text, so "provided" cannot be text-only. */
    it('should refuse null and undefined and accept any other value', () => {
      expect(provided(null)).toBe(false);
      expect(provided(undefined)).toBe(false);
      expect(provided(false)).toBe(true);
    });
  });
});
