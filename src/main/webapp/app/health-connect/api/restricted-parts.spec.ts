import { HttpHeaders } from '@angular/common/http';

import {
  RECORD_RESTRICTED_PARTS,
  RESTRICTED_PARTS,
  RESTRICTED_PARTS_HEADER,
  ROW_REMOVING_PARTS,
  parseRestrictedParts,
} from './restricted-parts';

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

  describe('the record endpoint names one of them (backlog item 126)', () => {
    it('knows exactly the one part GET /api/patients/{id} can withhold', () => {
      // `caseAssignments` is deliberately absent and its absence is the contract, not an omission:
      // a caller refused the case collection is refused the whole record, because that collection
      // is what entitlement is decided from. A record is served whole or not at all.
      expect(RECORD_RESTRICTED_PARTS).toEqual(['lastActivity']);
    });

    it('names nothing the client would not otherwise recognise', () => {
      // The record's list is a subset by construction (`satisfies readonly RestrictedPart[]` says
      // so at compile time); this says it at run time, so a token added to one array and not the
      // other cannot reach a screen through a parser that never heard of it.
      const known: readonly string[] = RESTRICTED_PARTS;

      expect(RECORD_RESTRICTED_PARTS.filter(part => !known.includes(part))).toEqual([]);
    });
  });

  describe('which parts remove rows, and so break a count (backlog item 125)', () => {
    it('knows exactly the one part that takes patients out of the directory', () => {
      // `api/`'s own `RestrictedPart.removesRows()`, re-derived here. Everything the dashboard's
      // demographic cards do is decided from this list, so a third row-removing token named by a
      // later release must be added here rather than to a screen.
      expect(ROW_REMOVING_PARTS).toEqual(['caseAssignments']);
    });

    it('does NOT name lastActivity, and that absence is the decision', () => {
      // The half that is easy to lose. `lastActivity` blanks a field no count reads — item 112 let
      // `GET /api/dashboard/summary` count straight through the same refusal for that reason — so
      // listing it here would withhold four correct figures from a pharmacist to no purpose.
      const rowRemoving: readonly string[] = ROW_REMOVING_PARTS;

      expect(rowRemoving).not.toContain('lastActivity');
    });

    it('names nothing the client would not otherwise recognise', () => {
      const known: readonly string[] = RESTRICTED_PARTS;

      expect(ROW_REMOVING_PARTS.filter(part => !known.includes(part))).toEqual([]);
    });
  });
});
