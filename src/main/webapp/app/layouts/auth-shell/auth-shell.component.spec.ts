import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { LANGUAGES } from 'app/config/language.constants';
import { CLINICAL_ROLES } from 'app/health-connect/authority-role';

import AuthShellComponent from './auth-shell.component';

/**
 * That the clinical-role figure on the sign-in page is the number of clinical roles, in every
 * language it is served in.
 *
 * <p>This is the check that would have caught `../../../../docs/backlog.md` item 149, and it is
 * written to fail the way that defect actually presented: **rendered**, per locale, against the real
 * catalogues. The page advertised nine disciplines for nine days after `ROLE_ANGEL` stopped being one
 * of them, in all four locales at once, and every gate in this repo was green throughout — so a check
 * that reads the source of truth on one side and the component on the other, without rendering
 * either, is the check that was already here and already passing.
 *
 * <p><b>The expectation is derived, never written.</b> It is {@link CLINICAL_ROLES}`.length`, and the
 * locales come from `LANGUAGES` rather than a list here — the `shift-names.spec.ts` pattern. Nothing
 * in this file writes `8`.
 *
 * <p><b>Why all four locales separately rather than English and an assumption.</b> The number reaches
 * the page through `[translateValues]`, so a locale whose `rolesValue` stopped saying `{{count}}` and
 * went back to a literal would bypass the derivation <em>in that locale alone</em> — English would
 * look perfect, which is the exact shape that let the original defect ship. `it.each(LANGUAGES)`
 * makes that one red case naming the locale.
 *
 * @see clinical-roles.spec.ts, which holds the list itself
 */
describe('AuthShellComponent', () => {
  /** One locale's `healthConnect` catalogue, read from disk the way `shift-names.spec.ts` reads it. */
  const catalogue = (locale: string): Record<string, unknown> => {
    const path = join(__dirname, '..', '..', '..', 'i18n', locale, 'healthConnect.json');
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  };

  /**
   * One locale's `rolesValue` — walked key by key rather than read through `as any`, so a
   * reorganised catalogue fails naming the path that moved rather than throwing `Cannot read
   * properties of undefined` and sending the reader here. The `shift-names.spec.ts` reasoning.
   */
  const roleCountTemplate = (locale: string): string => {
    let node: unknown = catalogue(locale);
    for (const key of ['healthConnect', 'brand', 'facts', 'rolesValue']) {
      if (typeof node !== 'object' || node === null || !(key in node)) {
        throw new Error(`${locale}/healthConnect.json has no healthConnect.brand.facts.rolesValue — it stops at '${key}'`);
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
   * The rendered figure beside "Clinical roles", found through the component's own fact list rather
   * than by position — the four figures are reorderable and a spec that hardcodes `[0]` would start
   * asserting something else about a different fact without failing.
   */
  const renderedRoleCount = (fixture: ComponentFixture<AuthShellComponent>): string => {
    const index = fixture.componentInstance.facts.findIndex(fact => fact.valueKey.endsWith('.rolesValue'));
    expect(index).toBeGreaterThanOrEqual(0);
    return (fixture.nativeElement.querySelectorAll('b')[index] as HTMLElement).textContent!.trim();
  };

  afterEach(() => TestBed.resetTestingModule());

  it('has roles to count, so the expectation below is not vacuously true', () => {
    expect(CLINICAL_ROLES.length).toBeGreaterThan(0);
  });

  it.each(LANGUAGES)('advertises the real number of clinical roles in %s', async locale => {
    const fixture = await renderIn(locale);
    expect(renderedRoleCount(fixture)).toBe(String(CLINICAL_ROLES.length));
  });

  it.each(LANGUAGES)('takes the %s figure from the code rather than from the catalogue', locale => {
    // The rendered assertion above is what matters; this one names the cause when it breaks. A
    // catalogue value carrying its own digits is a count somebody has to remember to update, which
    // is the whole of item 149.
    expect(roleCountTemplate(locale)).toContain('{{count}}');
    expect(roleCountTemplate(locale)).not.toMatch(/\d/);
  });
});
