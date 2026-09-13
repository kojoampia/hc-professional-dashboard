import { HttpHeaders } from '@angular/common/http';

import { RESTRICTED_PARTS, RESTRICTED_PARTS_HEADER, parseRestrictedParts } from './restricted-parts';

describe('parseRestrictedParts', () => {
  const headers = (value?: string): HttpHeaders =>
    value === undefined ? new HttpHeaders() : new HttpHeaders({ [RESTRICTED_PARTS_HEADER]: value });

  it('reads nothing from a response that carries no header — the silent, ordinary case', () => {
    // Five of the eight disciplines are refused nothing, and `api/` emits the header only when
    // something was withheld. If this ever returned a non-empty array, every clinician entitled to
    // the whole directory would be told part of it was withheld.
    expect(parseRestrictedParts(headers())).toEqual([]);
  });

  it('reads one token', () => {
    expect(parseRestrictedParts(headers('lastActivity'))).toEqual(['lastActivity']);
  });

  it('reads both tokens, keeping the order the server sent', () => {
    // `api/` promises RestrictedPart declaration order, and the header's own contract test there
    // exists because `Set.copyOf` once reordered it per JVM run. Preserving what arrived is the
    // only thing a client can honestly do about that.
    expect(parseRestrictedParts(headers('caseAssignments,lastActivity'))).toEqual(['caseAssignments', 'lastActivity']);
  });

  it('drops a token it does not know, and still reads the ones it does', () => {
    // `api/` may name a third part on a release this bundle predates. The alternative to dropping
    // it is rendering a wire token, or a missing translation key, on a clinical screen — the
    // `CareersHandoffService` rule, for the same reason.
    expect(parseRestrictedParts(headers('caseAssignments,medications,lastActivity'))).toEqual(['caseAssignments', 'lastActivity']);
  });

  it('reads nothing from a header naming only tokens it does not know', () => {
    expect(parseRestrictedParts(headers('medications'))).toEqual([]);
  });

  it('tolerates the whitespace a comma-separated header is allowed to carry', () => {
    expect(parseRestrictedParts(headers('caseAssignments, lastActivity'))).toEqual(['caseAssignments', 'lastActivity']);
  });

  it('matches tokens exactly, so a near miss is dropped rather than guessed at', () => {
    // Case included: HTTP header *names* are case-insensitive, header *values* are not, and the
    // tokens are camelCase on the wire.
    expect(parseRestrictedParts(headers('lastactivity,LASTACTIVITY,last-activity,lastActivityAt'))).toEqual([]);
  });

  it('knows exactly the two parts api/ declares', () => {
    // Derived elsewhere from this array — the page's treatment, the i18n keys and the specs above.
    // A third token added here without a treatment beside it should fail something, and this is it.
    expect(RESTRICTED_PARTS).toEqual(['caseAssignments', 'lastActivity']);
  });
});
