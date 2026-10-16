import { Address } from 'app/entities/address/model';
import { EmergencyContact } from 'app/entities/emergency-contact/model';
import { PersonalDocumentType } from 'app/entities/personal-document/types.enum';
import { Sex } from './sex.enum';

/**
 * The professional's credentialing profile as `GET`/`PUT /api/profile` carries it — `profile.md`
 * § Profile.
 *
 * <h2>The one wire type for this endpoint, since T6</h2>
 *
 * <p>It was a second type beside `OnboardingProfileDto` from T8 until T6, and the split was forced
 * rather than chosen: that type spoke the **deprecated singular `emergencyContact` wire alias** —
 * `Profile.getEmergencyContact()`, a `@Transient` projection of `contacts[0]` kept *"on the wire only
 * so the clients that have not migrated yet keep working"* — and a pane written against it could
 * express **one** contact where `profile.md:196` requires **two**, with the specified
 * `EmergencyContact.email` and `EmergencyContact.address` not on it at all. T6 retired the alias's
 * last `web/` caller (`ClinicalProfileComponent`, with the whole of `app/account/profile/`) and the
 * DTO with it, so this is the surviving shape and the only one. ⛔ **Do not reintroduce the alias
 * field here** — `web/` carrying no `emergencyContact` binder is what lets `api/` drop the alias
 * once `mobile/`'s Me tab (the other consumer, re-pointed on its own branch) stops speaking it.
 *
 * <h2>Every field is required, and that is a client-side rule</h2>
 *
 * <p>`Profile.java` carries **zero** `jakarta.validation` annotations. *"Every field in the Profile
 * model is required"* (`profile.md:185`) is enforced by the form and by
 * `ProfileCompleteness`/`PROFILE_COMPLETED` on save — **39 values minimum**, decided by the owner on
 * the literal reading of `:184`: the 10 typed `Profile` fields, all 7 of `Address`'s inputs, and 4 +
 * 7 on **each** of the two-or-more contacts, excluding `id`, `accountId` and `status`.
 *
 * <p>⚠ **`accountId` is read-only on the wire.** `@JsonProperty(access = READ_ONLY)` on the server
 * drops it before the handler sees it, and the service forces it from the token regardless, so a
 * `PUT` from one account naming another cannot reach the other's row. It is prefilled read-only in
 * the pane because `profile.md:191` says to show it, not because it is sent.
 *
 * <p>⚠ **`status` is the server's and is refused if a body names it.** `ProfileFieldOwnership` names
 * the endpoint that owns each refused field; an applicant who could write `status` would approve
 * their own credential review. It is on the model because a round trip returns it.
 */
export interface Profile {
  id?: string | null;
  /** The gateway `User.id`, forced from the token. See the class note. */
  accountId?: string | null;
  /**
   * ⚠ Present on `Profile` and **absent from `profile.md`'s model table**, though the read view's
   * header renders it. `ProfileCompleteness` excludes it from the required set for exactly that
   * reason, so the pane offers it and does not require it.
   */
  title?: string | null;
  firstName?: string | null;
  /**
   * ⚠ **`middleNames`, plural — the field `api/` has.** `profile.md` wrote `middleName`; the owner
   * aligned the specification to the code (`profile-addendum.md` § 6a, F6). It had an input nowhere in
   * the estate until this pane — row 230's `profile-requirements.ts` (retired with the old form in T6) listed it as a standing defect:
   * *"it can only ever be non-empty for a profile written by something other than this screen."* This
   * is that screen.
   */
  middleNames?: string | null;
  lastName?: string | null;
  birthDate?: string | null;
  sex?: Sex | null;
  mobilePhone?: string | null;
  /** ⚠ Required by `ProfileCompleteness`, and absent from the retired alias-speaking DTO — see the class note. */
  phoneNumber?: string | null;
  email?: string | null;
  address?: Address | null;
  /** Which identity document `cardNumber` is the number of. `IDENTITY_TYPES` is what the picker offers. */
  cardType?: PersonalDocumentType | null;
  cardNumber?: string | null;
  /**
   * Next of kin — **a list, and at least two** (`profile.md:196`). Deliberately optional on the type
   * and never defaulted to `[]`: the server distinguishes *"the caller sent no contacts"* from *"the
   * caller sent an empty list"*, and `Profile.java`'s own comment calls conflating them *"the single
   * most expensive line to get wrong here"* — an always-present empty array would empty a clinician's
   * next of kin on any partial write.
   */
  contacts?: EmergencyContact[] | null;
  /** The server's completeness stamp. Refused if a body names it. See the class note. */
  status?: ProfileStatus | null;
}

/**
 * The document types that count as proof of identity, as opposed to a credential — what the
 * `cardType` picker iterates.
 *
 * <p>Here beside the field it types rather than beside either screen that renders it: the wizard's
 * profile pane collects the card and the read view shows it afterwards, and a list that disagreed
 * between the two would let a clinician pick a type the other would not have accepted. (It lived in
 * `onboarding-api.service.ts` until T6 split that file; this is the surviving copy, moved rather
 * than duplicated.)
 *
 * <p>⚠ **Typed `PersonalDocumentType[]` rather than `OnboardingDocumentType[]` since F9.** Both
 * mirror `api/`'s `DocumentType`, but `profile.md` types `Profile.cardType` by `types.enum.ts` and
 * a TS string enum is **nominal** — a bare `'GHANACARD'` literal is not assignable to it — so this
 * list, which is what the card dropdown iterates, has to be members rather than literals or the
 * dropdown cannot produce a value the wire type accepts. (The enum has ten members since row 232
 * added `AVATAR`, which is not an identity document and is not offered: this list is the four
 * cards.)
 */
export const IDENTITY_TYPES: PersonalDocumentType[] = [
  PersonalDocumentType.PASSPORT,
  PersonalDocumentType.GHANACARD,
  PersonalDocumentType.DRIVERLICENSE,
  PersonalDocumentType.VOTERCARD,
];

/**
 * `api/domain/enumeration/ProfileStatus` — **deliberately `string` and not a mirror of its members.**
 *
 * <p>⛔ That enum has **23 values** today (`ACTIVE`, `CREATED`, `COMPLETED`, `PENDING`, `REJECTED`,
 * `ARCHIVED`, `DELETED`, `SUSPENDED`, `INACTIVE`, `DEACTIVATED`, `REVOKED`, `ONBOARDING`, `ON_LEAVE`,
 * `UNDER_REVIEW`, `APPROVED`, `APPLICATION_STARTED`, `PROFILE_COMPLETED`, `CREDENTIAL_REVIEW`,
 * `RETURNED_FOR_CORRECTION`, `ORGANIZATION_ASSIGNED`, `AUTHORITY_ASSIGNED`, `ROSTER_CONFIGURED`,
 * `EXPIRED` — read 2026-10-11 from `origin/main`), and **nothing anywhere would hold a TypeScript
 * copy of them to it.** `web/` has no equivalent of `api/`'s `JhipsterEnumFieldValuesTest`, and a
 * 23-member hand-transcribed union is the drift this estate keeps paying for (five copies of the
 * authority list, four of the shift vocabulary).
 *
 * <p>⭐ **A narrow union buys nothing here, because no T8 pane writes or renders this field.** The
 * server refuses a body that names it (`ProfileFieldOwnership`) and the wizard never displays it;
 * `PROFILE_COMPLETED` is stamped by `PUT /api/profile` itself. The field is on the model only so a
 * round trip carries it back untouched. ⚠ **T9's read view does render it** (`profile.md:118`), so
 * the derived vocabulary this paragraph deferred now exists — {@link PROFILE_STATUS_VALUES} below,
 * built by T9 for exactly the reason given here. The type stays `string`: the wire can carry a value
 * a stale build has no label for, and a union would make rendering it a compile error rather than
 * the graceful fallback the read view has.
 */
export type ProfileStatus = string;

/**
 * `api/domain/enumeration/ProfileStatus`'s 23 values, in declaration order — the runtime half that
 * {@link ProfileStatus} deliberately is not.
 *
 * <p>A runtime array for the reason `DUTY_ROSTER_SHIFTS` is one: a bare union cannot be enumerated,
 * so nothing could hold the four catalogues to it. `profile-status-names.spec.ts` beside this file
 * holds `healthConnect.profile.detail.profileStatus.*` in all four locales to exactly this list, both
 * directions — a value added here fails that spec until the catalogues carry it, and a retired value
 * fails it until the dead label goes.
 *
 * <p>⚠ **The link to the Java enum is still made by hand** — `web/` cannot read `api/` — so when
 * `ProfileStatus.java` moves, this list is the mirror to update, and the spec names it.
 */
export const PROFILE_STATUS_VALUES = [
  'ACTIVE',
  'CREATED',
  'COMPLETED',
  'PENDING',
  'REJECTED',
  'ARCHIVED',
  'DELETED',
  'SUSPENDED',
  'INACTIVE',
  'DEACTIVATED',
  'REVOKED',
  'ONBOARDING',
  'ON_LEAVE',
  'UNDER_REVIEW',
  'APPROVED',
  'APPLICATION_STARTED',
  'PROFILE_COMPLETED',
  'CREDENTIAL_REVIEW',
  'RETURNED_FOR_CORRECTION',
  'ORGANIZATION_ASSIGNED',
  'AUTHORITY_ASSIGNED',
  'ROSTER_CONFIGURED',
  'EXPIRED',
] as const;

/**
 * The seven `Profile` scalars the pane collects, beside the nested address and contacts.
 *
 * <p>⚠ `title` is **not** here: it is offered and optional, for the reason on the field. The seven are
 * `profile-addendum.md` § 3 T8's own count — *"profile fields the user types: `middleName`,
 * `birthDate`, `sex`, `mobilePhone`, `phoneNumber`, `cardType`, `cardNumber` — 7"*.
 */
export const PROFILE_INPUT_FIELDS = ['middleNames', 'birthDate', 'sex', 'mobilePhone', 'phoneNumber', 'cardType', 'cardNumber'] as const;

export type ProfileInputField = (typeof PROFILE_INPUT_FIELDS)[number];

/** The four `profile.md:187-194` prefills from the account and makes read-only. */
export const PROFILE_PREFILLED_FIELDS = ['accountId', 'firstName', 'lastName', 'email'] as const;

export type ProfilePrefilledField = (typeof PROFILE_PREFILLED_FIELDS)[number];

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Exhaustive<T extends true> = T;

/**
 * ⭐ That the three declared groups together account for **every** field of {@link Profile}.
 *
 * <p>The same compile-time partition row 230's `profile-requirements.ts` used (retired in T6), for the same
 * reason: a list of fields can agree with a model today and quietly stop. The groups are the seven
 * inputs, the four prefills, and the four this pane neither types nor prefills — `id` and `status`
 * (the server's), `title` (optional), `address` and `contacts` (their own field lists). A field added
 * to `Profile` fails the build here until somebody classifies it.
 */
export type ProfileFieldsAreExhaustive = Exhaustive<
  Equals<ProfileInputField | ProfilePrefilledField | 'id' | 'status' | 'title' | 'address' | 'contacts', keyof Profile>
>;
