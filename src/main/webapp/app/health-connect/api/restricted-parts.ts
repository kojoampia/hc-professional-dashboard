import { HttpHeaders } from '@angular/common/http';

/**
 * The parts of a composed read that `professionalservice` refused to the caller's discipline.
 *
 * <p>`GET /api/patients` composes the directory from three sibling reads, and a discipline outside
 * the scope-of-practice matrix for one of them is refused it by `hc-patient` — correctly, and
 * permanently. Rather than losing the whole directory (which is what happened until `api/`'s item
 * 107) the service degrades and names what it could not read in an `X-Restricted-Parts` response
 * header: comma-separated wire tokens, in `RestrictedPart` declaration order, and **absent
 * altogether when nothing was withheld** — which is the ordinary case for five of the eight
 * disciplines and must stay silent.
 *
 * <p><b>The two tokens are not two shades of one thing.</b> `lastActivity` blanks a column on rows
 * that are all present; `caseAssignments` means rows are <em>missing</em> — the caller was refused
 * the case collection, so a patient reached only through an assigned case is not in the body at
 * all. Nothing in the list can express the second, which is why the marker is collection-level and
 * why the directory page treats them differently rather than raising one banner for both.
 *
 * <p><b>These name what was refused during one read, and are not a capability list.</b> The
 * distinction is reachable rather than academic: `api/`'s `PatientDirectoryService.withinScope`
 * returns early when the caller has no patients at all, before the activity log is asked for, so a
 * technician with no tasks is answered `caseAssignments` alone while the same technician with one
 * task is answered both — although their discipline is refused the activity log either way. So the
 * set varies with caseload, and anything derived from it must be re-derived per read. Rendering a
 * standing per-discipline badge from it would show the badge change when a shift was assigned.
 *
 * @see PatientDirectoryService.RestrictedPart in `api/` — the contract this consumes
 * @see ../../../../../../docs/backlog.md items 107, 111, 114 and 126
 */
export const RESTRICTED_PARTS = ['caseAssignments', 'lastActivity'] as const;

/**
 * Derived from the runtime array rather than written as a bare union, for the reason
 * `DUTY_ROSTER_SHIFTS` is: a union cannot be enumerated at runtime and so cannot be asserted
 * against anything, and the parser below needs the values to recognise tokens with.
 */
export type RestrictedPart = (typeof RESTRICTED_PARTS)[number];

/**
 * The parts `GET /api/patients/{id}` can withhold — one, and **not** the same list as above.
 *
 * <p>`api/`'s item 112 emits the same header on the record, under the same `lastActivity` token,
 * and `caseAssignments` <b>cannot</b> reach it: a caller refused the case collection is refused the
 * whole record, because that collection is what entitlement is decided from. So a record is never
 * served short of cases — it is either served or it is not.
 *
 * <p><b>A separate array rather than a filter over {@link RESTRICTED_PARTS}, because the two lists
 * answer different questions</b> and the day `api/` names a third part it will be answerable for
 * one endpoint and not necessarily the other. The screen asks per entry here, so a part named on
 * the wire but absent from this list renders nothing at all — the same rule
 * {@link parseRestrictedParts} applies to a token it does not recognise, one layer up.
 *
 * <p><b>And the token being shared does not make the treatment shareable.</b> On the directory
 * `lastActivity` blanks one column of rows that are all present; on a record it withholds every
 * activity entry and the `lastActivityAt` with them. Reusing the list's sentence here would tell a
 * pharmacist that recent-activity sorting is unavailable while the patient's entire activity
 * history is missing — a new false sentence written while removing one. See `backlog.md` item 129.
 */
export const RECORD_RESTRICTED_PARTS = ['lastActivity'] as const satisfies readonly RestrictedPart[];

/** Derived from the runtime array, for {@link RestrictedPart}'s reason. */
export type RecordRestrictedPart = (typeof RECORD_RESTRICTED_PARTS)[number];

/**
 * The parts whose refusal removes <b>rows</b> from the directory — so anything counted over it is
 * short, and short by an amount nothing can state.
 *
 * <p>This is `api/`'s own `RestrictedPart.removesRows()` (its item 116), which that service uses to
 * decide which refusal deserves a WARN, re-derived here because the same distinction decides what a
 * client may render. `caseAssignments` means the caller was refused the case collection, so a
 * patient reached only through an assigned case is absent from the body; `lastActivity` blanks a
 * field on rows that are all present.
 *
 * <p><b>It is the difference between a marked figure and no figure.</b> A screen showing a
 * <em>list</em> can carry a `caseAssignments` refusal honestly — the rows it shows are real, and a
 * banner above them says others are missing. A screen showing a <em>count</em> cannot: the number is
 * lower than the truth, by an unknown amount, and it is rendered exactly as a correct one is. That
 * is `api/`'s Decision C (item 111) applied to a count this client computes rather than one the
 * service computes, and item 112's conclusion carried across: **a count that cannot be honestly
 * partial should not be shown partial.**
 *
 * <p><b>And the converse, which is the half that is easy to lose.</b> Item 112 let
 * `GET /api/dashboard/summary` count *through* a `lastActivity` refusal, because no field of it
 * derives from the activity log — there was never a partial number to protect. The same holds of the
 * demographic cards: they count membership, sex and childhood, none of which is the field
 * `lastActivity` blanks. Suppressing them for it would withhold four correct numbers to no purpose,
 * which is its own kind of lie about what the caller may see.
 *
 * <p>A part belongs here because of what it does to the <em>body</em>, not because of which screen
 * reads it — so a third row-removing token named by a later `api/` release belongs here even if no
 * count is derived from it yet.
 *
 * @see ../../../../../../docs/backlog.md items 111 (Decision C), 112 and 125
 */
export const ROW_REMOVING_PARTS = ['caseAssignments'] as const satisfies readonly RestrictedPart[];

/** Derived from the runtime array, for {@link RestrictedPart}'s reason. */
export type RowRemovingPart = (typeof ROW_REMOVING_PARTS)[number];

/** The response header `api/` emits. Named once so a spec and the reader cannot disagree. */
export const RESTRICTED_PARTS_HEADER = 'X-Restricted-Parts';

const KNOWN = new Set<string>(RESTRICTED_PARTS);

/**
 * The tokens of `X-Restricted-Parts` this client understands, in the order the server sent them.
 *
 * <p><b>An unrecognised token is dropped, never rendered.</b> `api/` may name a third part on a
 * release this bundle predates, and the alternative to dropping it is showing a clinician a wire
 * token — or worse, a translation key — in the middle of a clinical screen. Same rule, and the same
 * reason, as `CareersHandoffService` applying to an unknown `track`: degrade to the parts that are
 * understood, raise nothing, and go on working with no header at all.
 *
 * <p>A missing header and a header naming nothing known both yield an empty array, which is the
 * silent case: five disciplines see exactly the screen they saw before any of this existed.
 *
 * <p>Shared by the directory read and the record read, which emit the same header. It recognises
 * every token the client knows rather than only the ones a given endpoint can send, so the value
 * stored is what actually arrived; deciding what is renderable is the screen's job, and each asks
 * per part from its own list.
 */
export function parseRestrictedParts(headers: HttpHeaders): readonly RestrictedPart[] {
  const value = headers.get(RESTRICTED_PARTS_HEADER);
  if (value === null) {
    return [];
  }
  return value
    .split(',')
    .map(token => token.trim())
    .filter((token): token is RestrictedPart => KNOWN.has(token));
}
