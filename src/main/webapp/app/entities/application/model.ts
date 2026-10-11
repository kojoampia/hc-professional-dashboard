import { OnboardingApplicationDto, OnboardingStatus } from 'app/health-connect/api/onboarding-api.service';

/**
 * The professional application as `api/professional-application` carries it — `profile.md:236-263`.
 *
 * <p>⭐ **An alias, not a second copy.** `OnboardingApplicationDto` is the shape T3 shipped and
 * already carries every field `profile.md`'s step-4 table names — `agreed`, `agreedDate`,
 * `authority`, `profileId`, `status`, `source` — on the right base, with `startApplication`,
 * `saveConsent`, `submit` and `getOwnApplication` against it. ⛔ **A parallel interface here would
 * be a second wire type for one endpoint with no difference between them**, which is the drift this
 * repository keeps paying for: five copies of the authority list, four of the shift vocabulary.
 *
 * <p>⚠ **Contrast `entities/profile/model.ts`, where a second type IS declared.** The difference is
 * that the profile's existing wire type speaks a *deprecated alias* and cannot express step 2 at all;
 * this one is correct and complete. A second type is justified by a shape mismatch, never by the file
 * plan naming a `model.ts`.
 *
 * <p>So `profile.md`'s *"Model: — not exhaustive; `ProfessionalApplication.java` has more. Synchronize
 * this"* is satisfied by pointing at the one that is synchronised rather than by adding one that is
 * not.
 */
export type ProfessionalApplication = OnboardingApplicationDto;

/**
 * The statuses in which the applicant is the one holding the application — the states step 4's
 * Submit is their next move from.
 *
 * <p>`RETURNED_FOR_CORRECTION` is in the set and matters: an application a reviewer sent back is the
 * applicant's again, and `correctionNotes` is what they need to read. The other nine lifecycle
 * statuses belong to the admin chain.
 *
 * <p>⚠ **This is not the post-submit rule.** `WizardService.submitted` decides whether a *pane may
 * open*, and after submission every pane does — the panes stay editable because `OnboardingService`
 * stores a re-save of a `CREDENTIAL_REVIEW` application silently. What this list decides is narrower:
 * whether the **Submit button** is the thing to offer. Saying "I am finished" twice is a 409.
 */
export const APPLICANT_HELD_STATUSES = [
  'APPLICATION_STARTED',
  'PROFILE_COMPLETED',
  'RETURNED_FOR_CORRECTION',
] as const satisfies readonly OnboardingStatus[];

export function applicantHolds(status: OnboardingStatus | null | undefined): boolean {
  return status !== null && status !== undefined && (APPLICANT_HELD_STATUSES as readonly OnboardingStatus[]).includes(status);
}
