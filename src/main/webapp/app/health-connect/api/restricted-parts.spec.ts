import { HttpHeaders } from '@angular/common/http';

import {
  RECORD_RESTRICTED_PARTS,
  RESTRICTED_FOLLOW_UPS,
  RESTRICTED_FOLLOW_UPS_HEADER,
  RESTRICTED_PARTS,
  RESTRICTED_PARTS_HEADER,
  ROW_REMOVING_PARTS,
  hasUnrecognisedRestrictedParts,
  parseRestrictedFollowUps,
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

  describe('hasUnrecognisedRestrictedParts — reporting what the parser discards (backlog item 125)', () => {
    // Dropping a token is right for "what do I print" and backwards for "may I assert this number",
    // so the two functions are read together by anything rendering a count: the first says what can
    // be explained, the second whether anything could not be.
    it.each([
      ['no header at all', undefined, false],
      ['a header naming only known parts', 'caseAssignments,lastActivity', false],
      ['an empty header', '', false],
      ['a trailing comma, which is whitespace rather than a part', 'lastActivity,', false],
      ['a part named on a later api/ release', 'medications', true],
      ['a later part beside a known one', 'caseAssignments,medications', true],
      ['a near miss, which is a service defect or a mangled header either way', 'lastactivity', true],
    ])('%s', (_label, value, expected) => {
      expect(hasUnrecognisedRestrictedParts(headers(value))).toBe(expected);
    });

    it('agrees with the parser about what was dropped', () => {
      // The two must not disagree: a token counted known by one and unknown by the other either
      // prints a catalogue key that does not exist or suppresses figures that are perfectly good.
      const value = 'caseAssignments,medications,lastActivity';

      expect(parseRestrictedParts(headers(value))).toEqual(['caseAssignments', 'lastActivity']);
      expect(hasUnrecognisedRestrictedParts(headers(value))).toBe(true);
    });
  });

  describe('parseRestrictedFollowUps — what the same refusal blocks behind a row (backlog item 132)', () => {
    const followUps = (value?: string): HttpHeaders =>
      value === undefined ? new HttpHeaders() : new HttpHeaders({ [RESTRICTED_FOLLOW_UPS_HEADER]: value });

    it('reads nothing from a response that carries no header — the ordinary case, and six of the eight disciplines', () => {
      // Measured through the gateway on quality, 2026-09-17: technician `record`, pharmacist and
      // nurse no header at all. A false positive here withdraws the only way into a patient record
      // from every clinician in the estate.
      expect(parseRestrictedFollowUps(followUps())).toEqual([]);
    });

    it('reads the one token api/ sends', () => {
      expect(parseRestrictedFollowUps(followUps('record'))).toEqual(['record']);
    });

    it('drops a follow-up it does not know, and still reads the ones it does', () => {
      // `api/`'s item 128 argued a `cases` token buys a client nothing *today* and left the header
      // comma-separated so a later release can name one. This bundle would then be older than the
      // service answering it, which is the structural case here rather than the exotic one.
      expect(parseRestrictedFollowUps(followUps('cases,record'))).toEqual(['record']);
    });

    it('reads nothing from a header naming only follow-ups it does not know', () => {
      expect(parseRestrictedFollowUps(followUps('cases'))).toEqual([]);
    });

    it('tolerates the whitespace and the trailing comma a comma-separated header may carry', () => {
      expect(parseRestrictedFollowUps(followUps(' record, '))).toEqual(['record']);
    });

    it('matches exactly, so a near miss is dropped rather than guessed at', () => {
      // Header *values* are case-sensitive, and the token is lower case on the wire. Guessing here
      // would hide a service defect behind a screen that looks deliberate.
      expect(parseRestrictedFollowUps(followUps('Record,RECORD,records,record-page'))).toEqual([]);
    });

    it('is a different header from X-Restricted-Parts, and reads neither from the other', () => {
      // The two travel together — a technician is sent both — and they say different things: one
      // names what was withheld from THIS read, the other what a DIFFERENT read will refuse. Parsing
      // one out of the other's header is the single mistake that would collapse them back into one.
      const both = new HttpHeaders({
        [RESTRICTED_PARTS_HEADER]: 'caseAssignments,lastActivity',
        [RESTRICTED_FOLLOW_UPS_HEADER]: 'record',
      });

      expect(parseRestrictedParts(both)).toEqual(['caseAssignments', 'lastActivity']);
      expect(parseRestrictedFollowUps(both)).toEqual(['record']);
      expect(parseRestrictedParts(followUps('record'))).toEqual([]);
      expect(parseRestrictedFollowUps(new HttpHeaders({ [RESTRICTED_PARTS_HEADER]: 'caseAssignments' }))).toEqual([]);
    });

    it('knows exactly the one follow-up api/ declares', () => {
      // `PatientResource.RECORD`. Derived from elsewhere — the page's treatment and the i18n keys —
      // so a second token added here without a sentence beside it fails `restricted-part-names`.
      expect(RESTRICTED_FOLLOW_UPS).toEqual(['record']);
    });

    it('names no follow-up that is also a part, because the two vocabularies are not one', () => {
      // A follow-up is a *read that will refuse*, a part is *what this read lost*. `api/` spells
      // them in separate constants for that reason; if a token ever appeared in both lists, a screen
      // asking "was this refused" could not tell which question it had answered.
      const parts: readonly string[] = RESTRICTED_PARTS;

      expect(RESTRICTED_FOLLOW_UPS.filter(followUp => parts.includes(followUp))).toEqual([]);
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
