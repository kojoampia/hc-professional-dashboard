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

/**
 * The second header the directory read carries, and it answers a different question.
 *
 * <p>{@link RESTRICTED_PARTS_HEADER} names what was withheld from <em>this</em> read.
 * `X-Restricted-Follow-Ups` names a <em>different</em> read that will refuse — one reached from a row
 * the caller can see. Both are absent for a caller refused nothing; a technician is sent both.
 *
 * @see ../../../../../../docs/backlog.md items 128 and 132
 */
export const RESTRICTED_FOLLOW_UPS_HEADER = 'X-Restricted-Follow-Ups';

/**
 * The follow-up reads a directory response can say will refuse.
 *
 * <p>One token, `record` — `GET /api/patients/{id}`, the read behind a directory row. `api/` emits
 * it when a part it was refused is one the record path reads <b>strictly</b>: the refusal is
 * observed, by this same read, and the strictness is that service's own code rather than a copy of
 * hc-patient's scope-of-practice matrix held here. That derivation is the whole of item 128 and the
 * reason this is not a per-discipline capability list.
 *
 * <p><b>Present, it is never wrong; absent, it is not a promise.</b> `api/` records the marker as
 * *sufficient rather than complete* — a record could still refuse over a collection the directory
 * never reads, and the gap is only empty today because two sets in another product's table happen to
 * coincide. So a client may act on the token's presence and must not read its absence as an
 * assurance that a record will open.
 *
 * <p><b>`cases` is deliberately not here, and its absence is `api/`'s decision rather than an
 * omission.</b> `GET /api/patients/{id}/cases` refuses the same callers for the same reason (item
 * 127, which decided it keeps refusing), and a token for it would be true and useless: the cases
 * screen is reached *through* the record, so a client that has already withdrawn the record has said
 * everything a second token could add. A follow-up earns its place by letting a client render
 * something different.
 *
 * <p>An array rather than a bare union for {@link RESTRICTED_PARTS}'s reason — the parser needs the
 * values at run time, and the i18n spec derives its expected key set from it.
 *
 * @see PatientResource.RESTRICTED_FOLLOW_UPS and PatientResource.RECORD in `api/`
 */
export const RESTRICTED_FOLLOW_UPS = ['record'] as const;

/** Derived from the runtime array, for {@link RestrictedPart}'s reason. */
export type RestrictedFollowUp = (typeof RESTRICTED_FOLLOW_UPS)[number];

const KNOWN = new Set<string>(RESTRICTED_PARTS);

const KNOWN_FOLLOW_UPS = new Set<string>(RESTRICTED_FOLLOW_UPS);

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
 *
 * <p><b>Dropping is the right answer to "what do I print" and the wrong one to "may I assert this
 * number"</b> — see {@link hasUnrecognisedRestrictedParts}, which reports what this discards.
 */
export function parseRestrictedParts(headers: HttpHeaders): readonly RestrictedPart[] {
  return tokensOf(headers, RESTRICTED_PARTS_HEADER).filter((token): token is RestrictedPart => KNOWN.has(token));
}

/**
 * The follow-up reads this response says will refuse, as far as this client can name them.
 *
 * <p>Same rules as {@link parseRestrictedParts}, on the other header: unknown tokens are dropped
 * rather than rendered, whitespace and a trailing comma are tolerated, a near miss is a drop rather
 * than a guess, and a missing header yields an empty array — the silent case, which is most
 * disciplines and must stay exactly as it was before any of this existed.
 *
 * <p><b>No `hasUnrecognisedRestrictedFollowUps` beside it, deliberately.</b> The counterpart exists
 * for {@link RESTRICTED_PARTS_HEADER} because a dropped part may be row-removing, and a screen
 * showing a *count* then has to decline to state one. Nothing is counted from this header: it names
 * reads that will refuse, and a follow-up this bundle cannot name is one it has no affordance for
 * either — there is no link to withdraw and no figure to withhold. Adding the function now would be
 * a second copy of a rule with no caller, which is how this estate arrives at one wrong one.
 *
 * @see ../../../../../../docs/backlog.md item 132
 */
export function parseRestrictedFollowUps(headers: HttpHeaders): readonly RestrictedFollowUp[] {
  return tokensOf(headers, RESTRICTED_FOLLOW_UPS_HEADER).filter((token): token is RestrictedFollowUp => KNOWN_FOLLOW_UPS.has(token));
}

/**
 * Whether the header named a part this bundle does not recognise — the tokens
 * {@link parseRestrictedParts} silently drops, reported rather than discarded.
 *
 * <p>A screen rendering a <em>list</em> can ignore a token it cannot explain and still show rows
 * that are really there. A screen rendering a <em>count</em> cannot: if the unknown token is a
 * row-removing one, the figure is short and nothing in this bundle can know it. `api/`'s enum is
 * under active development — `blocksRecord` arrived with its item 128 — and the repos ship as
 * independently tagged images, so **a web bundle older than the service answering it is the
 * structural case rather than the exotic one**.
 *
 * <p>So the two directions are deliberately opposite: name nothing you cannot name, and assert no
 * number you cannot stand behind. A caller reading this should withhold the figure and say
 * something generic; it still must not render the token, which is the rule above and is unchanged.
 *
 * <p>A near miss counts as unrecognised rather than as nothing: `lastactivity` is either a service
 * defect or a mangled header, and both are reasons to distrust a count rather than grounds to
 * assume the read was complete.
 *
 * @see ../../../../../../docs/backlog.md item 125
 */
export function hasUnrecognisedRestrictedParts(headers: HttpHeaders): boolean {
  return tokensOf(headers, RESTRICTED_PARTS_HEADER).some(token => !KNOWN.has(token));
}

/**
 * The non-empty, trimmed tokens of one named header, recognised or not.
 *
 * <p>Empty tokens go before either question is asked, so a trailing comma is whitespace rather than
 * an unknown part — `"caseAssignments,"` must not blank a dashboard.
 *
 * <p><b>The header name is a parameter rather than this function having a twin</b>, because the two
 * headers carry the identical grammar and the tolerances above are the part that would drift: item
 * 132 added the second one, and a copy of this body would have had to re-learn the trailing comma.
 * The *vocabularies* stay apart — each caller filters against its own known set — which is what
 * keeps the two questions from collapsing into one.
 */
function tokensOf(headers: HttpHeaders, name: string): readonly string[] {
  const value = headers.get(name);
  if (value === null) {
    return [];
  }
  return value
    .split(',')
    .map(token => token.trim())
    .filter(token => token !== '');
}
