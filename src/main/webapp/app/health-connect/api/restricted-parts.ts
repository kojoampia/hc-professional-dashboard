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
 * @see ../../../../../../docs/backlog.md items 107, 111 and 114
 */
export const RESTRICTED_PARTS = ['caseAssignments', 'lastActivity'] as const;

/**
 * Derived from the runtime array rather than written as a bare union, for the reason
 * `DUTY_ROSTER_SHIFTS` is: a union cannot be enumerated at runtime and so cannot be asserted
 * against anything, and the parser below needs the values to recognise tokens with.
 */
export type RestrictedPart = (typeof RESTRICTED_PARTS)[number];

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
