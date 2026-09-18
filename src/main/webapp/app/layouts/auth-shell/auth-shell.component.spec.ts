import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { LANGUAGES } from 'app/config/language.constants';
import { CLINICAL_ROLES } from 'app/health-connect/authority-role';

import AuthShellComponent from './auth-shell.component';

/**
 * That the two counted figures on the sign-in page — clinical roles, and languages — are the sizes of
 * the lists they claim to count, in every language the page is served in.
 *
 * <p>This is the check that would have caught `../../../../docs/backlog.md` items 149 and 162, and it
 * is written to fail the way that defect actually presented: **rendered**, per locale, against the
 * real catalogues. The page advertised nine disciplines for nine days after `ROLE_ANGEL` stopped being
 * one of them, in all four locales at once, and every gate in this repo was green throughout — so a
 * check that reads the source of truth on one side and the component on the other, without rendering
 * either, is the check that was already here and already passing.
 *
 * <p><b>The language figure was `"4"` and correct when item 162 was filed</b>, which is the whole of
 * that row: it agreed with `LANGUAGES` by coincidence, exactly as the role figure once agreed with the
 * disciplines. `LANGUAGES` is the more likely of the two to move, because
 * `jhipster-needle-i18n-language-constant` lets the generator add to it without anybody deciding to.
 *
 * <p><b>The expectations are derived, never written.</b> They are {@link CLINICAL_ROLES}`.length` and
 * `LANGUAGES.length`, and the locales come from `LANGUAGES` too rather than a list here — the
 * `shift-names.spec.ts` pattern. Nothing in this file writes `8` or `4`.
 *
 * <p><b>Why all four locales separately rather than English and an assumption.</b> The numbers reach
 * the page through `[translateValues]`, so a locale whose value key stopped saying `{{count}}` and
 * went back to a literal would bypass the derivation <em>in that locale alone</em> — English would
 * look perfect, which is the exact shape that let the original defect ship. `it.each(LANGUAGES)`
 * makes that one red case naming the locale.
 *
 * <p><b>The other two figures are checked too, and checked to be the opposite.</b> `recordsValue` and
 * `rostersValue` are product claims — one shared record, round-the-clock cover — and count nothing
 * this code can reach. Holding them to their catalogue text is what stops a later pass from
 * "deriving" them from something plausible, and what makes this file's silence about them deliberate
 * rather than an omission.
 *
 * @see clinical-roles.spec.ts, which holds the role list itself
 * @see ../../config/language.constants.spec.ts, which holds the language list itself
 */
describe('AuthShellComponent', () => {
  /** One locale's `healthConnect` catalogue, read from disk the way `shift-names.spec.ts` reads it. */
  const catalogue = (locale: string): Record<string, unknown> => {
    const path = join(__dirname, '..', '..', '..', 'i18n', locale, 'healthConnect.json');
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  };

  /**
   * One locale's raw value for a fact — walked key by key rather than read through `as any`, so a
   * reorganised catalogue fails naming the path that moved rather than throwing `Cannot read
   * properties of undefined` and sending the reader here. The `shift-names.spec.ts` reasoning.
   */
  const factTemplate = (locale: string, fact: string): string => {
    let node: unknown = catalogue(locale);
    for (const key of ['healthConnect', 'brand', 'facts', fact]) {
      if (typeof node !== 'object' || node === null || !(key in node)) {
        throw new Error(`${locale}/healthConnect.json has no healthConnect.brand.facts.${fact} — it stops at '${key}'`);
      }
      node = (node as Record<string, unknown>)[key];
    }
    return node as string;
  };

  const renderIn = async (locale: string): Promise<ComponentFixture<AuthShellComponent>> => {
    await TestBed.configureTestingModule({
      imports: [AuthShellComponent, TranslateModule.forRoot()],
      providers: [provideRouter([])],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(locale, catalogue(locale));
    translate.use(locale);

    const fixture = TestBed.createComponent(AuthShellComponent);
    fixture.detectChanges();
    return fixture;
  };

  /**
   * The rendered figure for one fact, found through the component's own fact list rather than by
   * position — the four figures are reorderable and a spec that hardcodes `[0]` would start asserting
   * something else about a different fact without failing.
   */
  const renderedFact = (fixture: ComponentFixture<AuthShellComponent>, fact: string): string => {
    const index = fixture.componentInstance.facts.findIndex(entry => entry.valueKey.endsWith(`.${fact}`));
    expect(index).toBeGreaterThanOrEqual(0);
    return (fixture.nativeElement.querySelectorAll('b')[index] as HTMLElement).textContent!.trim();
  };

  afterEach(() => TestBed.resetTestingModule());

  it('has roles to count, so the expectation below is not vacuously true', () => {
    expect(CLINICAL_ROLES.length).toBeGreaterThan(0);
  });

  it('has languages to count, so the expectation below is not vacuously true', () => {
    // An empty `LANGUAGES` would make the rendered figure and the expectation agree on "0" forever,
    // and `it.each` would have no locale to run in — green, and asserting nothing at all.
    expect(LANGUAGES.length).toBeGreaterThan(0);
  });

  it.each(LANGUAGES)('advertises the real number of clinical roles in %s', async locale => {
    const fixture = await renderIn(locale);
    expect(renderedFact(fixture, 'rolesValue')).toBe(String(CLINICAL_ROLES.length));
  });

  it.each(LANGUAGES)('advertises the real number of languages in %s', async locale => {
    const fixture = await renderIn(locale);
    expect(renderedFact(fixture, 'languagesValue')).toBe(String(LANGUAGES.length));
  });

  it.each(LANGUAGES)('takes the %s role figure from the code rather than from the catalogue', locale => {
    // The rendered assertion above is what matters; this one names the cause when it breaks. A
    // catalogue value carrying its own digits is a count somebody has to remember to update, which
    // is the whole of item 149.
    expect(factTemplate(locale, 'rolesValue')).toContain('{{count}}');
    expect(factTemplate(locale, 'rolesValue')).not.toMatch(/\d/);
  });

  it.each(LANGUAGES)('takes the %s language figure from the code rather than from the catalogue', locale => {
    // Item 162, and the same reasoning one fact along: `"4"` here was right on the day it was written
    // and would stay `"4"` through the locale that makes it wrong.
    expect(factTemplate(locale, 'languagesValue')).toContain('{{count}}');
    expect(factTemplate(locale, 'languagesValue')).not.toMatch(/\d/);
  });

  it.each(LANGUAGES)('leaves the two %s product claims to the catalogue, digits and all', async locale => {
    // The counterpart of the two cases above, and the reason this file does not simply forbid digits
    // in the block: `recordsValue` and `rostersValue` are claims about the product, not counts of any
    // list this code can reach, so their text is theirs to keep — `"1"`, `"24/7"`. Rendering them
    // verbatim is what a later pass would break by "deriving" them from something plausible.
    const fixture = await renderIn(locale);
    for (const fact of ['recordsValue', 'rostersValue']) {
      const text = factTemplate(locale, fact);
      expect({ fact, text }).toEqual({ fact, text: expect.stringMatching(/\S/) });
      expect(text).not.toContain('{{');
      expect(renderedFact(fixture, fact)).toBe(text);
    }
  });
});
