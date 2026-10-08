/**
 * `Profile.sex` — `FEMALE` or `MALE`, and nothing else (F9).
 *
 * <p>`profile.md`'s Profile files list this file by name and by content:
 * `sex.enum.ts - {'FEMALE','MALE'}`. The field was `string | null` on the wire type and a free-text
 * `String` on the server, so `{"sex":"banana"}` type-checked here, stored there, and answered 200 —
 * and the server's completeness predicate counted it as provided, because the only thing it could
 * check was that there was text.
 *
 * <h2>A runtime array with the union derived from it, not a bare union or a `const enum`</h2>
 *
 * <p>Shaped exactly like `app/account/user/authority.enum.ts` beside it, and for the reason recorded
 * there and on `DUTY_ROSTER_SHIFTS`: **a bare union cannot be enumerated at runtime and so cannot be
 * asserted against anything**, which is how `authority.enum.ts`'s own `ROLE_TECHNICIAN` typo
 * survived in the repository unnoticed. A dropdown iterates {@link SEXES}; a template compares
 * against `Sex.FEMALE`; `sex.enum.spec.ts` holds the key/value identity rather than leaving the cast
 * below to be trusted.
 *
 * <p>⚠ **Declaration order matters and is the server's.** `net.jojoaddison.domain.enumeration.Sex`
 * declares `FEMALE, MALE` in that order and `JhipsterEnumFieldValuesTest` compares it against
 * `.jhipster/Profile.json`'s `fieldValues` **in order**. Nothing cross-checks this file against that
 * one — the link across to `api/` is made by hand, as the four shift vocabularies are — so keep the
 * two in step when either moves.
 *
 * <p>⛔ **No display labels here.** A sex is rendered through a translation key in all four
 * catalogues, like every other user-visible vocabulary in this repository; a label on the member
 * would be an English string in a shared file and would be invisible to `untranslated-literals`.
 */
export const SEXES = ['FEMALE', 'MALE'] as const;

/** The union of {@link SEXES}, derived from it so the two cannot disagree. */
export type Sex = (typeof SEXES)[number];

/**
 * Member access in the shape an `enum` would have offered: `Sex.FEMALE`.
 *
 * <p>Every key equals its value by construction. The cast is unavoidable — `Object.fromEntries`
 * returns an index signature and cannot know the keys cover the union — and it is sound only because
 * the entries come from {@link SEXES} itself. `sex.enum.spec.ts` asserts that rather than trusting
 * the cast.
 */
export const Sex: { readonly [K in Sex]: K } = Object.fromEntries(SEXES.map(sex => [sex, sex])) as { readonly [K in Sex]: K };
