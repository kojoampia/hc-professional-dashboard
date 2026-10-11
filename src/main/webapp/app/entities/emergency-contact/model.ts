import { Address } from 'app/entities/address/model';

/**
 * One next of kin — `profile.md` § EmergencyContact.
 *
 * <p>Embedded in `Profile.contacts`, with no endpoint and no service of its own
 * (`profile-addendum.md` § 2). **At least two are required** (`profile.md:196`), which is the whole
 * reason the profile carries a list rather than the singular `emergencyContact` it carried before T1.
 *
 * <p>⭐ **`id` is specified and is NOT a user input.** `profile-addendum.md` § 6a records that
 * shipping this type without it was conformance finding F5 — *"`EmergencyContact` without the `id`
 * the model gives it"* — overruled, and `api/` added it. It is on the wire, it is carried back and
 * forth untouched, and the form never shows it. ⚠ `Address.equals` on the server is id-based and
 * deliberately left so (F5's second half), so two blank-id addresses never compare equal; nothing
 * here depends on comparing contacts.
 *
 * <p>⚠ **`address` is a full nested {@link Address}**, not the plain string `api/`'s
 * `EmergencyContact` held before T1. That is what makes step 2 expensive: two contacts cost 2 × 11
 * inputs of the pane's 36 (`profile-addendum.md` § 3 T8).
 */
export interface EmergencyContact {
  id?: string | null;
  name?: string | null;
  relationship?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: Address | null;
}

/**
 * The four scalar fields a form collects on a contact, beside its nested address.
 *
 * <p>Runtime array, union derived — iterated to build the contact inputs and to count gaps.
 * {@link ContactInputFieldsAreExhaustive} proves it still covers the model at compile time.
 */
export const CONTACT_INPUT_FIELDS = ['name', 'relationship', 'email', 'phone'] as const;

export type ContactInputField = (typeof CONTACT_INPUT_FIELDS)[number];

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Exhaustive<T extends true> = T;

/** ⭐ Exactly `EmergencyContact` less `id` (server-assigned) and `address` (its own field list). */
export type ContactInputFieldsAreExhaustive = Exhaustive<Equals<ContactInputField, Exclude<keyof EmergencyContact, 'id' | 'address'>>>;

/**
 * How many contacts `profile.md:196` requires — *"at least two emergency contacts are required"*.
 *
 * <p>⚠ **Two, and that is a corrected figure.** `profile-addendum.md` § 6a finding F2: the shipped
 * completeness predicate accepted **one**, on a "behaviour-preserving" reading, and was overruled.
 * `api/OnboardingService.REQUIRED_CONTACTS` is the server's copy of this number and the gate that
 * actually refuses a submission; this one decides how many blank forms the pane opens with and when
 * the ✚ button stops being the only way forward.
 */
export const REQUIRED_CONTACTS = 2;
