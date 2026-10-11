/**
 * Mirrors `api/domain/enumeration/DocumentType`. Every value here is also a
 * `healthConnect.onboarding.documentTypes.*` key in all four catalogues — ⚠ **by hand, and nothing
 * checks it.** `api/`'s enum is not on this checkout, and the i18n specs under `app/core/i18n/`
 * compare the locales against *each other*: `catalogues.spec.ts` would not notice this group losing
 * a key in all four at once, and no spec enumerates this enum at all. So adding a value here is
 * two edits, and omitting the second one is green (verified by deleting a key from all four
 * locales — every web gate stayed green).
 *
 * <p>A derived gate is writable, unlike the one `mobile/`'s `document-type-names.spec.ts` says is
 * impossible there: that file's own problem was a bare union, which cannot be enumerated at
 * runtime, whereas this is a TS string enum and `Object.values(...)` enumerates it. That spec is
 * the template if one is ever wanted — it holds the catalogues to the list in both directions and
 * also catches a blank, a key echoed as its own name, and two types reading alike.
 */
export enum PersonalDocumentType {
  PASSPORT = 'PASSPORT',
  LICENSE = 'LICENSE',
  GHANACARD = 'GHANACARD',
  VOTERCARD = 'VOTERCARD',
  PASSPHOTO = 'PASSPHOTO',
  DRIVERLICENSE = 'DRIVERLICENSE',
  CERTIFICATE = 'CERTIFICATE',
  NHIS = 'NHIS',
  OTHER = 'OTHER',
  /**
   * The profile photo, and the one value here that is not a credential (backlog row 232).
   *
   * <p>Its own value rather than a reuse of `PASSPHOTO` because `api/`'s two `REQ_PHOTO`
   * predicates are `type == PASSPHOTO`: an avatar stored as a passport photo would let a selfie
   * satisfy a mandatory credential and carry an application to `CREDENTIAL_REVIEW`. It counts
   * towards nothing, and it is absent from `documents-tab.component.ts`'s `UPLOADABLE_TYPES` and
   * from `IDENTITY_TYPES` because neither picker offers anything but a credential — the avatar has
   * its own upload surface, and T8 owns the input.
   */
  AVATAR = 'AVATAR',
}
