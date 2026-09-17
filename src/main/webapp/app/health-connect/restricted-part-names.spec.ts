import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { LANGUAGES } from 'app/config/language.constants';

import { RECORD_RESTRICTED_PARTS, RESTRICTED_FOLLOW_UPS, RESTRICTED_PARTS, ROW_REMOVING_PARTS } from './api/restricted-parts';

/**
 * That every restricted part the directory can be handed has a sentence in every catalogue, and
 * that no locale is carrying English in place of one (backlog.md item 114).
 *
 * <p>The point of the whole item is that a clinician be *told* a part was withheld rather than left
 * to read a blank column as a quiet caseload. On three of the four locales, an untranslated string
 * is indistinguishable from that same defect wearing a different coat: ngx-translate renders the
 * key itself, so `healthConnect.patient.restricted.lastActivity` appears mid-screen with nothing
 * thrown and nothing logged, and the English build looks perfect.
 *
 * <p><b>The expectation is derived from {@link RESTRICTED_PARTS}, never listed here.</b> The day
 * `api/` names a third part and this client learns to recognise it, all four locales go red until
 * they carry it, with nobody having edited this file. `shift-names.spec.ts` beside this one is the
 * same shape for the same reason.
 *
 * <p><b>Why this exists when `core/i18n/catalogues.spec.ts` already compares key sets.</b> Parity
 * is a weaker claim than it looks: four catalogues agree perfectly when somebody pastes the English
 * sentence into the other three, and that is the likeliest way a locale lags — the keys are all
 * present, every parity check is green, and a French clinician is told in English that part of
 * their patient list is missing. So the last check below compares *values*, which parity cannot.
 */
describe('restricted-part notices', () => {
  /**
   * A named block of one locale's catalogue, from whichever file holds it.
   *
   * Walked key by key rather than read through `as any`, so a reorganised catalogue names the path
   * that moved instead of failing with `Cannot read properties of undefined`.
   *
   * <p>The filename is a parameter because the fifth block (item 135) lives in `error.json` rather
   * than `healthConnect.json` — it is what the *global error alert* says, not what a screen composes.
   */
  const blockIn = (locale: string, catalogue: string, ...path: string[]): Record<string, unknown> => {
    const file = join(__dirname, '..', '..', 'i18n', locale, catalogue);
    let node: unknown = JSON.parse(readFileSync(file, 'utf8'));
    for (const key of path) {
      if (typeof node !== 'object' || node === null || !(key in node)) {
        throw new Error(`${file} has no ${path.join('.')} — it stops at '${key}'`);
      }
      node = (node as Record<string, unknown>)[key];
    }
    return node as Record<string, unknown>;
  };

  /** The four screen-composed blocks, all of which are in `healthConnect.json`. */
  const block = (locale: string, ...path: string[]): Record<string, unknown> => blockIn(locale, 'healthConnect.json', ...path);

  /** The directory's notices: one per part, plus the marker the recency column shows. */
  const notices = (locale: string): Record<string, unknown> => block(locale, 'healthConnect', 'patient', 'restricted');

  /**
   * The record's notices, a separate block because the record needs its own sentence.
   *
   * <p>The token is the same `lastActivity`; the loss is not. On the list it blanks a column, on a
   * record it withholds every activity entry and the last-activity date with them — so the list's
   * sentence, printed here, would say that recency sorting is unavailable while the patient's whole
   * activity history is missing. `backlog.md` item 129 names that trap; the last check below is it,
   * made into a guard.
   */
  const recordNotices = (locale: string): Record<string, unknown> => block(locale, 'healthConnect', 'patient', 'recordRestricted');

  /**
   * The dashboard's notices, a third block for a third loss.
   *
   * <p>Keyed by part like the other two, but it carries a sentence only for the parts that remove
   * **rows**: those are the ones that make a count wrong, and a count is all these cards are. The
   * screen prints one in place of the four figures rather than beside them, so the sentence has to
   * account for their absence — which neither of the other two blocks does.
   */
  const dashboardNotices = (locale: string): Record<string, unknown> => block(locale, 'healthConnect', 'dashboard', 'restricted');

  /**
   * The directory's *other* notice, and the fourth block because it is a fourth kind of statement.
   *
   * <p>The three above all say what is **missing** — a column, a set of rows, a count. This one says
   * what will happen when the clinician **acts**: the rows are all here and complete, and the read
   * behind each of them will refuse. Keyed by follow-up rather than by part, because that is what
   * `X-Restricted-Follow-Ups` carries and the two vocabularies are deliberately separate.
   */
  const followUpNotices = (locale: string): Record<string, unknown> => block(locale, 'healthConnect', 'patient', 'restrictedFollowUps');

  /**
   * The fifth block, and the first one that is not in `healthConnect.json` at all (backlog item 135).
   *
   * <p>The four above are notices the *screen* composes from a header it read. This one is what the
   * global error alert says when `api/` answered **503** and the screen never rendered: the problem
   * document's `message` property is an i18n key, `alert-error.component.ts` hands it to
   * ngx-translate, and `PatientServiceUnavailableException.messageKey()` now names
   * `error.patientService.refused` or `.unreachable` instead of `error.http.503`. Until item 135 the
   * key always missed and the fallback — the problem's `detail`, written for an operator reading a
   * log — was printed verbatim, in English, whatever the clinician's locale.
   *
   * <p>So the file is `error.json` rather than `healthConnect.json`, and `blockIn` takes the filename
   * for that reason. Both files contribute to the same top-level `error` group in the merged
   * catalogue (`catalogues.spec.ts` models the merge); this one nests under `error.patientService`
   * rather than using a flat dotted key, so that merge stays clean.
   *
   * <p><b>`error.http.503` was added in the same change and is deliberately not checked here, because
   * nothing a clinician can do reaches it.</b> It is not covered by this block and it is not a fifth
   * sentence — it is the fallback for a 503 that named no key of its own, and it is left honest
   * rather than left looking covered. Measured 2026-09-17, `grep -rn 'SERVICE_UNAVAILABLE'` over
   * `api/src/main` and `gateway/src/main` finds exactly two producers of a 503 through `api/`'s
   * `ExceptionTranslator`: `PatientServiceUnavailableException`, which now names its own key, and
   * `AccountIdMigrationResource` — an admin migration tool that no `web/` or `mobile/` surface calls
   * at all (`grep -rn 'account-id-migration' web/src mobile/src` is empty). `gateway/src/main` names
   * the status nowhere. An nginx 503 never gets here either: it arrives as an HTML string and takes
   * `alert-error.component.ts`'s `else` arm, which has no key to translate.
   *
   * <p>So the only remaining route to `error.http.503` is a **wrapped**
   * `PatientServiceUnavailableException`, which `ExceptionTranslator.getCustomizedTitle` records as
   * unreachable today and checked rather than assumed.
   *
   * <p><b>And it is an honest fallback for only half of what could arrive there, which is the part not
   * to misread.</b> A wrapped one is as likely a refusal as an outage, and `error.http.503` says "the
   * service is temporarily unavailable, please try again shortly" — which for a wrapped refusal is
   * false retry advice replacing a true `detail`, the same defect the third key below exists to stop,
   * on the fallback instead of on the mapping. So the key is worth keeping because a plain sentence
   * beats an operator's log line, **not** because it would be correct; the day a wrapping path
   * appears, the fix is walking the cause chain in `getMappedMessageKey` and `getCustomizedTitle`
   * together, not trusting this.
   */
  const outageNotices = (locale: string): Record<string, unknown> => blockIn(locale, 'error.json', 'error', 'patientService');

  /**
   * The three sentences `api/` can name, spelled out rather than imported.
   *
   * <p>There is nothing in `web/` to derive them from — unlike `RESTRICTED_PARTS`, the vocabulary is
   * `api/`'s and arrives as a string in a response body, so the only copy on this side is the
   * catalogue these check. Spelled to match `PatientServiceUnavailableException`'s
   * `REFUSED_MESSAGE_KEY`, `UNREACHABLE_MESSAGE_KEY` and `FAULTED_MESSAGE_KEY`, whose own guard is
   * `PatientServiceRefusalProblemTest.theMessageKeysAreTheConstantsTheExceptionDeclares`; the two
   * repositories are held together by nothing but these three literals, which is why they are written
   * out here where somebody will read them rather than hidden behind a helper.
   *
   * <p><b>`faulted` is the third because two were not enough, and how two failed is worth the line.</b>
   * `api/`'s key was chosen by `isAuthorisationRefusal()` alone, while the operator-facing `detail`
   * beside it has always keyed its retry advice on `clearsOnRetry()` as well — so `SCHEMA` and
   * `NO_TOKEN`, which are neither a refusal nor retryable, took the `unreachable` sentence. The
   * clinician read a translated "try again in a few minutes" directly under a `detail` reading "will
   * NOT clear on retry", and the sibling had in fact answered; retrying fails identically until a DTO
   * ships. Replacing an opaque true sentence with a fluent false one is the trade item 107 exists to
   * refuse, so both sides split three ways now.
   */
  const OUTAGE_KEYS = ['refused', 'unreachable', 'faulted'];

  /** Every key this feature renders: one notice per part, plus the marker the recency column shows. */
  const REQUIRED_KEYS = [...RESTRICTED_PARTS, 'lastActivityCell'];

  it('has parts to check', () => {
    // A derived expectation over an empty list asserts nothing at all, quietly and forever.
    expect(RESTRICTED_PARTS.length).toBeGreaterThan(0);
  });

  it.each(LANGUAGES)('has a %s sentence for every part, and for the column marker', locale => {
    // Named rather than counted, so a failure says which key to write.
    expect(REQUIRED_KEYS.filter(key => !notices(locale)[key])).toEqual([]);
  });

  it.each(LANGUAGES)('carries no %s key for a part this client would not render', locale => {
    // The mirror of the check above. A token dropped from RESTRICTED_PARTS leaves a sentence that
    // reads perfectly and is shown to nobody — the shape `MORNING` and `AFTERNOON` left behind.
    const stray = Object.keys(notices(locale)).filter(key => !REQUIRED_KEYS.includes(key));

    expect(stray).toEqual([]);
  });

  it.each(LANGUAGES)('has no blank or key-echoing %s sentence', locale => {
    const strings = notices(locale);
    const echoes = (value: string, key: string): boolean => value === key || value.includes('healthConnect.patient.restricted');

    expect(REQUIRED_KEYS.filter(key => String(strings[key]).trim() === '' || echoes(String(strings[key]), key))).toEqual([]);
  });

  it.each(LANGUAGES.filter(locale => locale !== 'en'))('says it in %s rather than repeating the English', locale => {
    // The check key parity cannot make. These are whole sentences, not a proper noun that reads the
    // same everywhere, so any of them matching English means that locale was left behind — the
    // "English now, translations later" state this repo does not have.
    const english = notices('en');
    const strings = notices(locale);

    expect(REQUIRED_KEYS.filter(key => strings[key] === english[key])).toEqual([]);
  });

  describe('the record screen (backlog item 126)', () => {
    it('has parts to check', () => {
      expect(RECORD_RESTRICTED_PARTS.length).toBeGreaterThan(0);
    });

    it.each(LANGUAGES)('has a %s sentence for every part the record can be refused', locale => {
      expect(RECORD_RESTRICTED_PARTS.filter(part => !recordNotices(locale)[part])).toEqual([]);
    });

    it.each(LANGUAGES)('carries no %s key for a part the record cannot be refused', locale => {
      // `caseAssignments` is the live case: it cannot reach `GET /api/patients/{id}` at all, because
      // a caller refused the case collection is refused the whole record. A sentence for it here
      // would read perfectly and be shown to nobody.
      const recordParts: readonly string[] = RECORD_RESTRICTED_PARTS;
      const stray = Object.keys(recordNotices(locale)).filter(key => !recordParts.includes(key));

      expect(stray).toEqual([]);
    });

    it.each(LANGUAGES)('has no blank or key-echoing %s sentence', locale => {
      const strings = recordNotices(locale);
      const bad = RECORD_RESTRICTED_PARTS.filter(
        part => String(strings[part]).trim() === '' || String(strings[part]).includes('healthConnect.patient'),
      );

      expect(bad).toEqual([]);
    });

    it.each(LANGUAGES.filter(locale => locale !== 'en'))('says it in %s rather than repeating the English', locale => {
      const english = recordNotices('en');
      const strings = recordNotices(locale);

      expect(RECORD_RESTRICTED_PARTS.filter(part => strings[part] === english[part])).toEqual([]);
    });

    it.each(LANGUAGES)('does not reuse the %s list sentence for the record', locale => {
      // Item 129's trap, as a guard. Copying the directory's string into the record is the cheap
      // way to ship this feature and it writes a new false sentence while removing one: "no
      // last-activity date is shown for any patient" describes a column, not a withheld history.
      // Every locale, because a copy made in one catalogue is as wrong as a copy made in four.
      const list = notices(locale);
      const record = recordNotices(locale);

      expect(RECORD_RESTRICTED_PARTS.filter(part => record[part] === list[part] || record[part] === list.lastActivityCell)).toEqual([]);
    });
  });

  describe('the follow-up reads a directory row leads to (backlog item 132)', () => {
    it('has follow-ups to check', () => {
      expect(RESTRICTED_FOLLOW_UPS.length).toBeGreaterThan(0);
    });

    it.each(LANGUAGES)('has a %s sentence for every follow-up the directory can say will refuse', locale => {
      expect(RESTRICTED_FOLLOW_UPS.filter(followUp => !followUpNotices(locale)[followUp])).toEqual([]);
    });

    it.each(LANGUAGES)('carries no %s key for a follow-up this client would not render', locale => {
      // `cases` is the live case: `api/` refuses `GET /api/patients/{id}/cases` to exactly the same
      // callers and deliberately does not name it (its items 127 and 128), because the cases screen
      // is reached *through* the record. A sentence for it here would read perfectly and be shown to
      // nobody — and would invite someone to wire it up, stacking a second notice saying the same.
      const followUps: readonly string[] = RESTRICTED_FOLLOW_UPS;
      const stray = Object.keys(followUpNotices(locale)).filter(key => !followUps.includes(key));

      expect(stray).toEqual([]);
    });

    it.each(LANGUAGES)('has no blank or key-echoing %s sentence', locale => {
      const strings = followUpNotices(locale);
      const bad = RESTRICTED_FOLLOW_UPS.filter(
        followUp => String(strings[followUp]).trim() === '' || String(strings[followUp]).includes('healthConnect.patient'),
      );

      expect(bad).toEqual([]);
    });

    it.each(LANGUAGES.filter(locale => locale !== 'en'))('says it in %s rather than repeating the English', locale => {
      // Row 123, third occurrence. Pasting the English sentence into the other three catalogues
      // leaves every key-level gate in `core/i18n/` green — all 265 of them — because they compare
      // key sets and this is the only check in the repository that compares a value.
      const english = followUpNotices('en');
      const strings = followUpNotices(locale);

      expect(RESTRICTED_FOLLOW_UPS.filter(followUp => strings[followUp] === english[followUp])).toEqual([]);
    });
  });

  describe("the dashboard's demographic cards (backlog item 125)", () => {
    /**
     * Every key that screen can print: one per row-removing part, plus the one for a part it could
     * not name at all.
     *
     * <p>`unknown` is not a part and never will be. It is what the screen says when
     * {@link parseRestrictedParts} dropped a token: the dropped part may be row-removing, in which
     * case the figures are short and nothing in the bundle can say why. Listed by hand because
     * nothing can derive it — there is no array of the tokens this client has not heard of.
     */
    const DASHBOARD_KEYS = [...ROW_REMOVING_PARTS, 'unknown'];

    it('has parts to check', () => {
      expect(ROW_REMOVING_PARTS.length).toBeGreaterThan(0);
    });

    it.each(LANGUAGES)('has a %s sentence for every part that breaks a count, and for the unnameable one', locale => {
      expect(DASHBOARD_KEYS.filter(key => !dashboardNotices(locale)[key])).toEqual([]);
    });

    it.each(LANGUAGES)('carries no %s key for a part that leaves the counts standing', locale => {
      // `lastActivity` is the live case: it blanks a field no card reads, so the figures are shown
      // and nothing is said. A sentence for it here would be shown to nobody — or worse, would be
      // found later and wired up, suppressing four correct numbers.
      const stray = Object.keys(dashboardNotices(locale)).filter(key => !DASHBOARD_KEYS.includes(key));

      expect(stray).toEqual([]);
    });

    it.each(LANGUAGES)('has no blank or key-echoing %s sentence', locale => {
      const strings = dashboardNotices(locale);
      const bad = DASHBOARD_KEYS.filter(
        key => String(strings[key]).trim() === '' || String(strings[key]).includes('healthConnect.dashboard'),
      );

      expect(bad).toEqual([]);
    });

    it.each(LANGUAGES.filter(locale => locale !== 'en'))('says it in %s rather than repeating the English', locale => {
      const english = dashboardNotices('en');
      const strings = dashboardNotices(locale);

      expect(DASHBOARD_KEYS.filter(key => strings[key] === english[key])).toEqual([]);
    });

    it.each(LANGUAGES)('tells a named refusal apart from an unnameable one in %s', locale => {
      // Two different claims, and the difference is what a reader can act on: one knows what was
      // withheld, the other knows only that something was. If they ever read alike, the screen has
      // stopped distinguishing "your role may not read case assignments" from "this portal is older
      // than the service answering it" — conditions with different remedies and different owners.
      const strings = dashboardNotices(locale);

      expect(new Set(DASHBOARD_KEYS.map(key => strings[key])).size).toBe(DASHBOARD_KEYS.length);
    });

    it.each(LANGUAGES)('does not reuse the %s list sentence on the dashboard', locale => {
      // Item 129's trap again, and here the token is *the same one* the directory has a sentence
      // for, so copying it across is a single keystroke. The two say different things: on the
      // directory the list in front of the clinician is short but usable, on the dashboard there is
      // no figure at all — "this list is incomplete" printed over four missing cards describes
      // neither.
      const list = notices(locale);
      const dashboard = dashboardNotices(locale);

      expect(ROW_REMOVING_PARTS.filter(part => dashboard[part] === list[part])).toEqual([]);
    });
  });

  describe('the 503 a composed read answers with (backlog item 135)', () => {
    it.each(LANGUAGES)('has a %s sentence for each of the three things a 503 can mean', locale => {
      // Named rather than counted, so a failure says which key to write.
      expect(OUTAGE_KEYS.filter(key => !outageNotices(locale)[key])).toEqual([]);
    });

    it.each(LANGUAGES)('carries no %s key `api/` cannot name', locale => {
      // The mirror. `messageKey()` returns one of exactly three strings, chosen by
      // `isAuthorisationRefusal()` and then `clearsOnRetry()` — the same two predicates, in the same
      // order, as the `detail`'s outlook clause. A fourth sentence here would read perfectly and be
      // shown to nobody, and would invite somebody to wire up a fault classification that does not
      // exist.
      //
      // This check went from two keys to three when `faulted` was added, and that is what it is for
      // rather than collateral: `api/` and `web/` hold no shared constant, so the set of sentences a
      // clinician can be shown is pinned only here, and a key added on one side without the other is
      // exactly the drift this names.
      const stray = Object.keys(outageNotices(locale)).filter(key => !OUTAGE_KEYS.includes(key));

      expect(stray).toEqual([]);
    });

    it.each(LANGUAGES)('has no blank or key-echoing %s sentence', locale => {
      const strings = outageNotices(locale);
      const bad = OUTAGE_KEYS.filter(key => String(strings[key]).trim() === '' || String(strings[key]).includes('error.patientService'));

      expect(bad).toEqual([]);
    });

    it.each(LANGUAGES.filter(locale => locale !== 'en'))('says it in %s rather than repeating the English', locale => {
      // Row 123, fourth occurrence — and the one where an untranslated string is hardest to notice,
      // because this sentence appears only when the sibling stack is refusing or down. The defect
      // item 135 closes was *exactly* this: a perfectly good English sentence shown to every locale,
      // green on every key-level gate, for as long as nobody was looking.
      const english = outageNotices('en');
      const strings = outageNotices(locale);

      expect(OUTAGE_KEYS.filter(key => strings[key] === english[key])).toEqual([]);
    });

    it.each(LANGUAGES)('tells a refusal, an outage and a fault apart in %s', locale => {
      // Shaped like the dashboard's `tells a named refusal apart from an unnameable one`, and for the
      // same reason: three remedies, three owners. A refusal is a scope-of-practice rule working as
      // designed — retrying never helps and the administrator is who to ask; an outage clears itself
      // and nobody needs telling unless it persists; a fault clears for nobody until somebody ships a
      // change, so the clinician needs to know that retrying is pointless *and* that it is not their
      // doing. One sentence covering any two of those states neither, and `api/` went to the trouble
      // of three keys precisely so this side could say three things.
      //
      // `faulted` and `refused` are the pair most likely to converge, because both end in "trying
      // again will not help" — and they must not, because only one of them is a rule rather than a
      // defect, and only one of them has anything for an administrator to fix.
      const strings = outageNotices(locale);

      expect(new Set(OUTAGE_KEYS.map(key => strings[key])).size).toBe(OUTAGE_KEYS.length);
    });
  });

  it.each(LANGUAGES)('says something different in every one of the five %s restriction blocks', locale => {
    // Row 129's trap, generalised — and generalised rather than answered with a fifth pairwise
    // check, which is what adding the follow-up sentence would otherwise have cost. There are five
    // blocks now (list, follow-up, record, dashboard, 503) and the pairs grow quadratically, so the
    // day somebody adds a sixth the pairwise checks would cover it only if they remembered to write
    // four more. This one covers it by construction, and item 135's block joined it by being added
    // to this one list.
    //
    // Two sentences that read alike have lost a distinction the markup still pretends to draw: the
    // clinician sees two notices and learns one thing. The blocks say, in order, that rows are
    // missing / that this column is blank / that acting on a row will be refused / that a panel is
    // withheld / that a count cannot be stated / that the page was not filled at all — six different
    // remedies and, for three of them, a different owner.
    //
    // The 503 pair is the one most likely to converge on the others, because it is the same refusal
    // by the same sibling seen from further away: `error.patientService.refused` and the record's
    // `caseAssignments` notice both mean "your role may not read this", and the difference is that
    // one screen rendered with a panel missing while the other never rendered at all.
    const everySentence = [
      ...Object.values(notices(locale)),
      ...Object.values(followUpNotices(locale)),
      ...Object.values(recordNotices(locale)),
      ...Object.values(dashboardNotices(locale)),
      ...Object.values(outageNotices(locale)),
    ].map(String);

    expect(new Set(everySentence).size).toBe(everySentence.length);
  });

  it('says something different about each part in English', () => {
    // One banner covering both was the rejected alternative: `lastActivity` blanks a column on rows
    // that are all present, `caseAssignments` means rows are missing, and a sentence that fits both
    // states neither. If these two ever read the same, the distinction has been lost in the words
    // even though the markup still renders two of them.
    const strings = notices('en');

    expect(new Set(RESTRICTED_PARTS.map(part => strings[part])).size).toBe(RESTRICTED_PARTS.length);
  });
});
