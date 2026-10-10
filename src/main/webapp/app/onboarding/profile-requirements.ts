import {
  OnboardingAddressDto,
  OnboardingEmergencyContactDto,
  OnboardingProfileDto,
  OnboardingRequirementKey,
} from 'app/health-connect/api/onboarding-api.service';

/**
 * Which values step 2 requires, where each is entered, and which requirement it belongs to — the data
 * behind the form's client-side validation (`backlog.md` row 230, unit B).
 *
 * <h2>⭐ Why this file exists, which is the question row 230 unit B has to answer</h2>
 *
 * <p>Row 230's owner decision is *"Option 2 plus validating requirements at the user input stage in
 * the form … They should know all requirements and what gaps remain"* — so the form has to say which
 * values are missing **before anything reaches the server**. The server cannot do that: it knows only
 * what was saved, and telling the applicant before they save is the entire point.
 *
 * <p>⛔ **But a hand-written copy of the server's rules in TypeScript is the thing this estate keeps
 * paying for** — *"two correct-for-now copies is how an estate arrives at one wrong one"* — and there
 * are already five mirrors of the authority list and four of the shift vocabulary to prove it. So the
 * question is not whether to validate client-side but **what stops this drifting**. Three answers, and
 * the first is the load-bearing one.
 *
 * <h2>1. ⭐ The compiler forces every model field to be CLASSIFIED, not merely listed</h2>
 *
 * <p>A list of required fields can agree with the model today and silently stop agreeing. So this file
 * does not declare one list; it **partitions** the wire model's fields into three, by where the value
 * is entered:
 *
 * <ul>
 *   <li>{@link PROFILE_FIELDS_ON_THIS_FORM} — required, and this form has an input for it. These get
 *       `Validators.required` and appear in the gap list.</li>
 *   <li>{@link PROFILE_FIELDS_FROM_THE_ACCOUNT} — required, but owned by the gateway account and
 *       **deliberately not on this form**. `clinical-profile.component.ts` records the reasoning:
 *       they exist here *and* on the account, the account is what signs you in, and showing both would
 *       put one field on one page twice with one save not affecting the other.</li>
 *   <li>{@link PROFILE_FIELDS_WITH_NO_INPUT} — required by the server and typed **nowhere in the
 *       estate**. A standing defect, named rather than hidden.</li>
 * </ul>
 *
 * <p>{@link ProfileFieldsAreExhaustive} then asserts that those three unions, together, are **exactly**
 * `keyof OnboardingProfileDto` less the stated non-inputs — and it is a *type*, so it fails **to
 * compile**. ⚠ So a field added to the wire model does not fall through a crack: `npx ng build` goes
 * red here until somebody says which of the three it is.
 *
 * <p>⚠ **It does not name the field, and this paragraph claimed it did.** The real diagnostic is
 * `TS2344: Type 'false' does not satisfy the constraint 'true'` on whichever of the three
 * `…AreExhaustive` lines broke — so it names the *group*, and neither the field nor the DTO; the
 * reader diffs the array against the interface themselves. It is still a stronger guard than a list,
 * whose failure mode is silence, but the line number is the whole of the help it gives.
 *
 * <h2>2. The form is proved against this file by a spec</h2>
 *
 * <p>`clinical-profile.component.spec.ts` asserts that the set of controls carrying
 * `Validators.required` equals {@link REQUIRED_CONTROLS} exactly, in both directions. A control that
 * loses its validator fails; a field added to the partition without a control fails.
 *
 * <h2>3. The predicate is one rule, not thirty-nine</h2>
 *
 * <p>{@link provided} is the only predicate here — `hasText`-or-non-null, the same reading of
 * "provided" that `ProfileCompleteness.hasText` uses and for the same stated reason: *"a blank string
 * is what an untouched input posts, and counting it would make the whole predicate satisfiable by
 * submitting an empty form."* There is no per-field logic to drift.
 *
 * <h2>⭐ The server explicitly delegates this, so it is not an invasion of its job</h2>
 *
 * <p>`ProfileCompleteness.missingRequirements`'s own javadoc draws precisely this line:
 *
 * <blockquote>⚠ **Three keys, not 39.** The grouping is `profile.md`'s own — the Profile model, the
 * Address model, the EmergencyContact list — and it is what the client has labels for. **Which of the
 * eleven values inside a contact is missing is the form's to show, not the refusal's.**</blockquote>
 *
 * <p>So the division of labour is the server's own: it owns *which requirement* is unsatisfied — three
 * keys, which {@link REQUIREMENT_FOR_GROUP} mirrors and nothing here re-derives — and the form owns
 * *which value inside it* is blank. This file implements the second half only.
 *
 * <h2>⛔ Which definition of "complete" this mirrors, because there are two and they differ</h2>
 *
 * <p>**The gate, `ProfileCompleteness` — every field — and not the meter's advisory predicates.**
 * `OnboardingService.REQUIREMENT_KEYS`'s javadoc is emphatic that the two sites share a key set and
 * **not** their predicates: the meter leaves `middleNames`, `town`, `district` and `digitalAddress`
 * optional so that a meter does not go *down* when a clinician starts typing, while the submit gate
 * requires all of them because `profile.md` says every field is required.
 *
 * <p>⚠ **A form has neither problem, and mirroring the looser predicate would reproduce the exact
 * defect row 230 exists to remove.** A required control left empty is an un-filled field, not a
 * regression — nothing goes backwards — whereas a form validated against the *advisory* predicate
 * would let an applicant fill everything it asked for, read a satisfied requirement, and still be
 * refused at Submit. That is *"the client reads complete while the server refuses"*, one layer down
 * from where row 230 found it.
 *
 * <p>⛔ **Do not unify the server's two predicates to match this file.** That is the "finish the job"
 * change `REQUIREMENT_KEYS` forbids: it would either soften the gate or make the meter punish typing.
 * The asymmetry is correct — this form is stricter than the meter and no stricter than Submit.
 */

/** Fields of `OnboardingProfileDto` that are not user inputs at all, so the partition excludes them. */
type NotAProfileInput =
  // Server-assigned. `accountId` is READ_ONLY over HTTP and forced from the token.
  | 'id'
  | 'accountId'
  // Nested models, with their own field lists below.
  | 'address'
  | 'emergencyContact'
  // ⚠ Excluded by the server too: `ProfileCompleteness` records that `title` "is not in profile.md's
  // Profile model table" even though the page header renders it. Optional here, to match.
  | 'title';

/**
 * Required by the server **and** entered on this form, so these carry `Validators.required` and show a
 * gap when blank.
 *
 * <p>`sex` and `cardType` are enums (F9) and arrive from a `<select>`; {@link provided} treats a
 * non-empty string and a non-null value alike, so one predicate covers them with the free-text fields.
 */
export const PROFILE_FIELDS_ON_THIS_FORM = ['birthDate', 'sex', 'mobilePhone', 'cardType', 'cardNumber'] as const;

/**
 * Required by the server, supplied by the **gateway account**, and deliberately absent from this form.
 *
 * <p>⛔ **Do not add `Validators.required` for these.** There is no input to fix them with, so a
 * required control would leave the form permanently invalid with a disabled Save button and nothing on
 * screen to click — a far worse failure than the one this file is closing. `clinical-profile.component`
 * prefills them from the account and merges them back on save; the account tab is where they are
 * edited.
 */
export const PROFILE_FIELDS_FROM_THE_ACCOUNT = ['firstName', 'lastName', 'email'] as const;

/**
 * ⛔ **Required by `ProfileCompleteness` and typed nowhere in the estate** — a standing defect, named
 * here rather than left as an empty cell.
 *
 * <p>`middleNames` is one of the ten values `personalDetailsProvided` requires, this form has a control
 * for it and **no input**, and unlike the account-sourced three it has no fallback either —
 * `prefill` reads `profile.middleNames ?? ''`. So it can only ever be non-empty for a profile written
 * by something other than this screen.
 *
 * <p>⚠ It is **not** in the advisory meter predicate, which is why nothing shows it today: the meter's
 * `profile` requirement reads satisfied while the submit gate would refuse. Giving it an input is T8's
 * (the wizard) or T6's; it is listed here so that the compiler counts it and a reader is not told the
 * partition is complete when one member of it has nowhere to be typed.
 */
export const PROFILE_FIELDS_WITH_NO_INPUT = ['middleNames'] as const;

/** The seven input fields of an `Address` — `profile.md`'s eight less `id`, which is not an input. */
export const ADDRESS_FIELDS = ['digitalAddress', 'streetAddress', 'town', 'city', 'district', 'region', 'country'] as const;

/** One emergency contact, as far as this wire model carries it — see {@link WIRE_MODEL_GAP}. */
export const CONTACT_FIELDS = ['name', 'relationship', 'phone'] as const;

export type ProfileFieldOnThisForm = (typeof PROFILE_FIELDS_ON_THIS_FORM)[number];
export type AddressField = (typeof ADDRESS_FIELDS)[number];
export type ContactField = (typeof CONTACT_FIELDS)[number];

/**
 * ⭐ **The compile-time proof that the partition above still accounts for every field of the wire
 * model.**
 *
 * <p>`Equals` is mutual assignability, which for string-literal unions is set equality. Each assertion
 * instantiates it with the declared unions on one side and `keyof` the interface on the other, so **a
 * field added to or removed from a DTO stops this file compiling**, and `npx ng build` names it.
 *
 * <p>⚠ `tsc` alone is not a sufficient gate in this repository in general — unrouted files are never
 * type-checked — but this file is imported by a routed component, so both `tsc` and `ng build` reach
 * it.
 */
type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Exhaustive<T extends true> = T;

export type ProfileFieldsAreExhaustive = Exhaustive<
  Equals<
    ProfileFieldOnThisForm | (typeof PROFILE_FIELDS_FROM_THE_ACCOUNT)[number] | (typeof PROFILE_FIELDS_WITH_NO_INPUT)[number],
    Exclude<keyof OnboardingProfileDto, NotAProfileInput>
  >
>;
export type AddressFieldsAreExhaustive = Exhaustive<Equals<AddressField, keyof OnboardingAddressDto>>;
export type ContactFieldsAreExhaustive = Exhaustive<Equals<ContactField, keyof OnboardingEmergencyContactDto>>;

/**
 * ⚠ **The gap between this wire model and the server's 39 values — read before assuming this file
 * validates everything `profile.md` requires.**
 *
 * <p>`ProfileCompleteness` requires **39** values: 10 on `Profile`, 7 on its `Address`, and 11 on each
 * of **at least two** contacts. This wire model can express 19 of them. The shortfall is **not** this
 * file's to close and **not** row 230 unit B's scope — it is the model change `profile-addendum.md`
 * assigns to **T6**, whose own row records that `mobile/` carries the identical defect:
 *
 * | missing from the wire model | values |
 * | --- | --- |
 * | `Profile.phoneNumber` | 1 |
 * | `EmergencyContact.email` | 1 |
 * | `EmergencyContact.address` — a nested `Address` | 7 |
 * | a **second** contact: the model carries singular `emergencyContact`, T1's deprecated alias | 11 |
 *
 * <p>⛔ **One consequence is live and invisible from this file:** `OnboardingService.nextOfKinComplete`
 * requires **two** complete contacts and this form can supply **one**, so the `nextOfKin` requirement
 * is **unsatisfiable through this screen** for every clinician, whatever they type. Measured on the
 * running quality stack 2026-10-10: `nurse` reads **89%** with `nextOfKin` the single outstanding
 * requirement of nine — exactly this.
 *
 * <p>⛔ **So the screen says two things at once, and a reader should expect that rather than treat it
 * as a bug.** Until T6 widens the DTO, for a clinician who has filled in their one contact:
 *
 * | surface | shows | because |
 * | --- | --- | --- |
 * | the meter's requirement row, from the server | `nextOfKin` **outstanding** | the server counts two contacts |
 * | the form's gap list, from this file | `nextOfKin` **absent** | {@link CONTACT_FIELDS} is one contact's three fields, and they are given |
 *
 * <p>⚠ **This paragraph used to carry a ⛔ against "relaxing `nextOfKin` client-side", which reads as
 * an assurance that it is not relaxed. It is** — not by a special case, but structurally, because a
 * three-field model of a two-contact requirement cannot express the requirement. The existing spec
 * showing `[]` for the one-contact fixture is that behaviour, passing.
 *
 * <p>⭐ **Nothing here should be changed to close the gap**, and the reason is not the one the ⛔ gave:
 * the server's reading stays visible in the meter, so the applicant is still told the truth by the
 * surface that knows it, and the fix is a model change the owner has already assigned to T6 and
 * already accepted as outstanding. What would be wrong is making the *form* claim completeness —
 * which it does not, because it never reports completeness, only gaps.
 */
export const WIRE_MODEL_GAP = {
  serverRequiredValues: 39,
  expressibleHere: 19,
  /** Why: see the table above. Each entry is T6's. */
  absent: ['phoneNumber', 'contact.email', 'contact.address', 'a second contact'],
} as const;

/**
 * The requirement key each group belongs to — the server's own three-way grouping, mirrored because the
 * applicant is shown gaps under the same labels the meter uses.
 *
 * <p>`satisfies` against {@link OnboardingRequirementKey} rather than bare strings, so a key renamed in
 * the shared vocabulary fails here too.
 */
export const REQUIREMENT_FOR_GROUP = {
  profile: 'profile',
  address: 'address',
  contact: 'nextOfKin',
} as const satisfies Record<string, OnboardingRequirementKey>;

export type ProfileFieldGroup = keyof typeof REQUIREMENT_FOR_GROUP;

/**
 * Every control this form requires, with the group — and therefore the requirement — it belongs to.
 *
 * <p>⭐ **This is the list the form and its spec both read**, which is what makes the two provably
 * agree: the component builds its validators from nothing else, and the spec compares the form's actual
 * required set against this. The control name *is* the model field name for all fifteen, so no naming
 * rule sits between them to be got wrong.
 */
export const REQUIRED_CONTROLS: { group: ProfileFieldGroup; field: string }[] = [
  ...PROFILE_FIELDS_ON_THIS_FORM.map(field => ({ group: 'profile' as const, field })),
  ...ADDRESS_FIELDS.map(field => ({ group: 'address' as const, field })),
  ...CONTACT_FIELDS.map(field => ({ group: 'contact' as const, field })),
];

/**
 * "Provided", in the one sense this file has — the client-side reading of `ProfileCompleteness.hasText`.
 *
 * <p>A blank or whitespace-only string is what an untouched input posts, so counting it would make the
 * validation satisfiable by submitting an empty form. Enums and dates arrive as non-empty strings from a
 * `<select>` or a date input, so one predicate covers every field.
 */
export function provided(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined;
}
