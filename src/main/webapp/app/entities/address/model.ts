/**
 * A structured postal address — `profile.md` § Address.
 *
 * <p>Embedded, with no endpoint and no service of its own: `profile-addendum.md` § 2 records that
 * `address/` and `emergency-contact/` *"correctly have no `service.ts` and no dialog"*, because both
 * are reached only through the profile that holds them.
 *
 * <p>⚠ **Eight fields specified against fourteen in `api/`'s class.** `Address.java` additionally
 * carries `areaCode`, `state` and four audit fields. The audit fields are rightly absent from any
 * input; `areaCode` and `state` are **writable on the server with no input anywhere in the estate**
 * (`profile-addendum.md` § 3 T1), so nothing will populate them. They are left out here too rather
 * than given inputs the specification does not ask for — adding them would be deciding something
 * `profile.md` does not say.
 *
 * <p>⚠ **`id` is not an input.** It is the `@Id` of a `@Document(collection = "address")`, so an
 * embedded address stores one; the form never collects it and the server assigns it. It is on the
 * model because a round trip carries it back and a write must not drop it.
 */
export interface Address {
  id?: string | null;
  digitalAddress?: string | null;
  streetAddress?: string | null;
  town?: string | null;
  city?: string | null;
  district?: string | null;
  region?: string | null;
  country?: string | null;
}

/**
 * The seven fields a form collects — `profile.md`'s eight less `id`.
 *
 * <p>A runtime array with the union derived from it, the house idiom: a bare union cannot be
 * enumerated at run time, and this one is iterated to build the address inputs and to count the gaps.
 * {@link AddressInputFieldsAreExhaustive} is the compile-time proof it still covers the model.
 */
export const ADDRESS_INPUT_FIELDS = ['digitalAddress', 'streetAddress', 'town', 'city', 'district', 'region', 'country'] as const;

export type AddressInputField = (typeof ADDRESS_INPUT_FIELDS)[number];

/**
 * ⭐ That {@link ADDRESS_INPUT_FIELDS} is exactly `Address` less the fields that are not inputs.
 *
 * <p>Same mechanism as `onboarding/profile-requirements.ts`: `Equals` is mutual assignability, which
 * for string-literal unions is set equality, and `Exhaustive<T extends true>` fails **to compile**
 * when it is not. So a field added to `Address` stops this file compiling until somebody says whether
 * the wizard collects it. ⚠ The diagnostic names the *line*, not the field — `TS2344: Type 'false'
 * does not satisfy the constraint 'true'` — so diff the array against the interface.
 */
type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Exhaustive<T extends true> = T;

export type AddressInputFieldsAreExhaustive = Exhaustive<Equals<AddressInputField, Exclude<keyof Address, 'id'>>>;
