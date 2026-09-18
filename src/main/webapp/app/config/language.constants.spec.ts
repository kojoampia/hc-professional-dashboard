import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import dayjs from 'dayjs/esm';

import 'app/config/dayjs';
import FindLanguageFromKeyPipe from 'app/shared/language/find-language-from-key.pipe';

import { LANGUAGES } from './language.constants';

/**
 * That "the languages this portal is served in" is a list this repo can count, that every member of it
 * is a language, and that the catalogues on disk are the same set.
 *
 * <p>This is the guard `../../../docs/backlog.md` item 162 asks for, and it is the sibling of
 * `health-connect/clinical-roles.spec.ts`, which item 149 wrote for the fact beside it on the sign-in
 * page. That page advertises a language count; until item 162 the number was a literal `"4"` in four
 * translation catalogues, **correct on the day it was written**, and no gate in this repo could see it
 * go stale — parity passes because the key exists in every locale, `untranslated-literals` passes
 * because it is translated, `brand-terms` passes because a digit is not a denied term.
 *
 * <p><b>This list is likelier to move than the role list was.</b> `LANGUAGES` carries
 * `jhipster-needle-i18n-language-constant`, so the generator adds to it — a locale can arrive without
 * anybody deciding to change a count.
 *
 * <p><b>The expectations here are derived, never listed.</b> Nothing below writes `4`, and nothing
 * below names a locale: `catalogues.spec.ts` already asserts the shipping set is exactly en/es/fr/de,
 * because four languages is a product condition. This file asserts the different thing item 162 needs
 * — that whatever the set is, the code and the catalogues agree on it, so a figure derived from
 * `LANGUAGES` is a figure about what the portal actually ships.
 *
 * <p><b>`dayjs.ts` carries a fourth copy, and review found this docstring had missed it.</b> Its
 * `jhipster-needle-i18n-language-dayjs-imports` registers one locale per language, and a language in
 * `LANGUAGES` without a matching import is the quietest failure of the four: `main.component.ts` calls
 * `dayjs.locale(lang)` on every switch, and an unregistered locale is a **silent no-op that leaves
 * dayjs on the previously selected language** — it does not fall back to English. Month names, weekday
 * names and humanized durations then render in whatever locale was chosen before, which is invisible to
 * anyone testing in English. It is guarded below off `dayjs.Ls`, dayjs's own registry of loaded locales,
 * so nothing here is hand-kept.
 *
 * <p><b>What is deliberately not guarded here.</b> `find-language-from-key.pipe.ts` and
 * `webpack/webpack.custom.js` each carry their own copy of the set behind their own needle. The pipe
 * is checked in the direction that can break — every language offered must have a display name, or the
 * sidebar switcher throws — but not in reverse, because an entry in the pipe ships nothing and
 * advertises nothing. The webpack group list is not read here at all: a locale missing from it
 * produces no merged catalogue, which `catalogues.spec.ts` fails on in CI by construction.
 *
 * @see clinical-roles.spec.ts, the same shape of check for the clinical disciplines
 * @see ../layouts/auth-shell/auth-shell.component.spec.ts, which holds the rendered numeral to this list
 */
describe('LANGUAGES', () => {
  /** The catalogue directories the app ships, `src/main/webapp/i18n/<locale>/`. */
  const catalogueDirectories = (): string[] => {
    const root = resolve(__dirname, '..', '..', 'i18n');
    return readdirSync(root)
      .filter(entry => statSync(join(root, entry)).isDirectory())
      .sort();
  };

  it('has languages to count, so a derived expectation cannot assert nothing', () => {
    // An empty list would make every count below trivially agree, quietly and forever.
    expect(LANGUAGES.length).toBeGreaterThan(0);
  });

  it('holds locale codes and nothing else, so nothing but a language can raise the count', () => {
    // A count is only as honest as the list it counts. The region form is allowed because `pt-BR` is
    // a locale somebody may legitimately add; what this refuses is a member that is not a locale at
    // all — a needle written as a string, a placeholder, a comment that became data.
    // Up to two subtags, because generator-jhipster 8.1.0's own languageTag list includes the
    // script+region form — az-Latn-az, kr-Latn-kr, uz-Cyrl-uz, uz-Latn-uz. Review found the
    // one-subtag form refused all four, which failed this guard's own stated standard: refusing a
    // locale the generator can legitimately emit is a guard that punishes the correct change.
    expect(LANGUAGES.filter(language => !/^[a-z]{2}(-[A-Za-z]{2,4}){0,2}$/.test(language))).toEqual([]);
  });

  it('names each language once, so the count is a count of languages and not of entries', () => {
    expect(LANGUAGES.filter((language, index) => LANGUAGES.indexOf(language) !== index)).toEqual([]);
  });

  it('offers every language it ships a catalogue for, and ships one for every language it offers', () => {
    // Both directions, because they fail differently. A language in the list with no catalogue is
    // loud — `catalogues.spec.ts` cannot read the directory. A catalogue with no entry in the list is
    // silent: it is built and served, nobody can select it, and the advertised figure undercounts it.
    expect([...LANGUAGES].sort()).toEqual(catalogueDirectories());
  });

  it('has a dayjs locale loaded for every language it offers, so dates are not silently left behind', () => {
    // The quietest of the four copies. main.component.ts calls dayjs.locale(lang) on every switch, and
    // an unregistered locale is a NO-OP: dayjs stays on the previously selected language rather than
    // falling back to English, so dates render in whatever was chosen before. Invisible to anyone
    // testing in English, and invisible to every other check here. Derived from dayjs's own registry,
    // not from a second list — importing app/config/dayjs above is what populates it.
    expect(LANGUAGES.filter(language => !(language in dayjs.Ls))).toEqual([]);
  });

  it('has a display name for every language it offers', () => {
    // The direction that throws: `sidebar.component.html` pipes each member through this pipe, and
    // `transform` reads `.name` off the entry without checking there is one — so a missing name is a
    // `TypeError` rather than a blank. Caught here so the failure names the language instead of
    // stopping at the first one.
    const pipe = new FindLanguageFromKeyPipe();
    const unnamed = LANGUAGES.filter(language => {
      try {
        return !/\S/.test(pipe.transform(language));
      } catch {
        return true;
      }
    });

    expect(unnamed).toEqual([]);
  });
});
