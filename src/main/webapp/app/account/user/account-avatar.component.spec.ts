import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ErrorHandlerInterceptor, SKIP_ERROR_ALERT } from 'app/core/interceptor/error-handler.interceptor';
import { EventManager } from 'app/core/util/event-manager.service';

import AccountAvatarComponent from './account-avatar.component';

const CONTENT_PATH = 'services/professionalservice/api/personal-document/doc-1/content';

describe('Account Avatar Component', () => {
  let fixture: ComponentFixture<AccountAvatarComponent>;
  let comp: AccountAvatarComponent;
  let httpMock: HttpTestingController;
  let createObjectURL: jest.Mock;
  let revokeObjectURL: jest.Mock;

  beforeEach(async () => {
    createObjectURL = jest.fn().mockReturnValue('blob:avatar-1');
    revokeObjectURL = jest.fn();
    // jsdom implements neither, so both are installed rather than spied on.
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = createObjectURL;
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = revokeObjectURL;

    await TestBed.configureTestingModule({
      imports: [AccountAvatarComponent, TranslateModule.forRoot()],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AccountAvatarComponent);
    comp = fixture.componentInstance;
  });

  afterEach(() => httpMock.verify());

  /**
   * ⛔ **The whole reason this component exists.** `imageUrl` names
   * `GET /api/personal-document/{id}/content`, which is behind `assertOwnerOrReviewer` and needs the
   * `Authorization` header — so a bare `<img src>` gets a 401 and renders broken. Through `HttpClient`
   * the auth interceptor attaches the token.
   */
  it('should fetch the content path as a blob rather than binding it as an image source', () => {
    comp.imageUrl = CONTENT_PATH;
    comp.ngOnChanges();

    const request = httpMock.expectOne(CONTENT_PATH);
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['x']));

    expect(createObjectURL).toHaveBeenCalled();
    expect(comp.objectUrl()).toBe('blob:avatar-1');
  });

  it('should render the fetched blob as the image source', () => {
    comp.imageUrl = CONTENT_PATH;
    // ngOnChanges by hand: the input is set on the instance rather than through a host template, so
    // detectChanges alone does not call the hook.
    comp.ngOnChanges();
    httpMock.expectOne(CONTENT_PATH).flush(new Blob(['x']));
    fixture.detectChanges();

    const image = fixture.nativeElement.querySelector('[data-cy="accountAvatarImage"]') as HTMLImageElement | null;
    expect(image).not.toBeNull();
    expect(image!.getAttribute('src')).toBe('blob:avatar-1');
    expect(fixture.nativeElement.querySelector('[data-cy="accountAvatarInitials"]')).toBeNull();
  });

  it('should render the initials and ask for nothing when there is no avatar', () => {
    comp.initials = 'AM';
    fixture.detectChanges();

    httpMock.expectNone(() => true);
    expect(fixture.nativeElement.querySelector('[data-cy="accountAvatarInitials"]').textContent.trim()).toBe('AM');
  });

  /**
   * ⚠ **A 404 is a reachable, ordinary state**, not an error: the avatar upload and the
   * `PUT /api/account` that records its path are two requests, and a replacement changes the document
   * id — so a failure between them leaves `imageUrl` naming a document that no longer exists. The
   * honest rendering is the initials. ⛔ A broken-image glyph or an alert would turn "upload again"
   * into something that reads as a fault.
   */
  it('should fall back to the initials when the content endpoint refuses, without reporting it', () => {
    comp.imageUrl = CONTENT_PATH;
    comp.initials = 'AM';
    comp.ngOnChanges();

    // A Blob body on the error arm: HttpTestingController refuses to convert a string for a
    // responseType of 'blob', which is the shape a real 404 arrives in anyway.
    httpMock.expectOne(CONTENT_PATH).flush(new Blob(['gone']), { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(comp.objectUrl()).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="accountAvatarInitials"]').textContent.trim()).toBe('AM');
    expect(fixture.nativeElement.querySelector('[data-cy="accountAvatarImage"]')).toBeNull();
  });

  /**
   * Every `createObjectURL` pins its blob until it is revoked, and the sidebar holds one of these for
   * the whole session.
   */
  it('should revoke the object URL on destroy', () => {
    comp.imageUrl = CONTENT_PATH;
    comp.ngOnChanges();
    httpMock.expectOne(CONTENT_PATH).flush(new Blob(['x']));

    fixture.destroy();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:avatar-1');
    expect(comp.objectUrl()).toBeNull();
  });

  /**
   * ⚠ **Revoked when the replacement ARRIVES, not when its fetch starts.** The circle keeps showing
   * the current photograph while the next one loads rather than flashing to initials and back, and a
   * fetch that fails cannot leave the component showing nothing.
   */
  it('should keep the current avatar until the replacement arrives, then revoke it', () => {
    comp.imageUrl = CONTENT_PATH;
    comp.ngOnChanges();
    httpMock.expectOne(CONTENT_PATH).flush(new Blob(['x']));

    createObjectURL.mockReturnValue('blob:avatar-2');
    comp.imageUrl = 'services/professionalservice/api/personal-document/doc-2/content';
    comp.ngOnChanges();

    // Still the old one, and nothing revoked yet.
    expect(comp.objectUrl()).toBe('blob:avatar-1');
    expect(revokeObjectURL).not.toHaveBeenCalled();

    httpMock.expectOne(comp.imageUrl).flush(new Blob(['y']));

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:avatar-1');
    expect(comp.objectUrl()).toBe('blob:avatar-2');
  });

  /**
   * ⛔ **An out-of-order response must not win.** With a subscribe per change, an avatar replaced
   * twice could have the FIRST response arrive last — rendering the photograph the clinician had just
   * overwritten, and overwriting the second blob's object URL without revoking it. `switchMap`
   * unsubscribes the previous request, which also aborts it, so the superseded request is gone: it is
   * not merely ignored, it is no longer open, which `httpMock.verify()` in `afterEach` proves.
   */
  it('should abort a superseded fetch rather than letting it arrive late', () => {
    comp.imageUrl = CONTENT_PATH;
    comp.ngOnChanges();
    const first = httpMock.expectOne(CONTENT_PATH);

    const second = 'services/professionalservice/api/personal-document/doc-2/content';
    comp.imageUrl = second;
    comp.ngOnChanges();

    expect(first.cancelled).toBe(true);
    createObjectURL.mockReturnValue('blob:avatar-2');
    httpMock.expectOne(second).flush(new Blob(['y']));

    expect(comp.objectUrl()).toBe('blob:avatar-2');
  });

  /**
   * ⛔ **A response landing after the component is gone used to create an object URL with nobody left
   * to revoke it.** `ngOnDestroy` cannot help — the blob would be created after it ran — so the
   * pipeline carries `takeUntilDestroyed`.
   *
   * <p>⭐ **The guarantee turned out to be stronger than "the late response is ignored", and the test
   * is written to the stronger one.** Destroying the component unsubscribes the pipeline, which
   * **cancels the in-flight request**: `flush` then throws *"Cannot flush a cancelled request"*,
   * which is how this case first failed. So a response cannot arrive late at all, and the assertion
   * is over `cancelled` rather than over a `createObjectURL` that was never going to be reached.
   */
  it('should cancel an in-flight fetch when the component is destroyed', () => {
    comp.imageUrl = CONTENT_PATH;
    comp.ngOnChanges();
    const request = httpMock.expectOne(CONTENT_PATH);
    expect(request.cancelled).toBe(false);

    fixture.destroy();

    expect(request.cancelled).toBe(true);
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  /** And the pipeline survives a failure: the next avatar is still fetched and still rendered. */
  it('should go on fetching after a refused response', () => {
    comp.imageUrl = CONTENT_PATH;
    comp.ngOnChanges();
    httpMock.expectOne(CONTENT_PATH).flush(new Blob(['gone']), { status: 404, statusText: 'Not Found' });

    const second = 'services/professionalservice/api/personal-document/doc-2/content';
    comp.imageUrl = second;
    comp.ngOnChanges();
    createObjectURL.mockReturnValue('blob:avatar-2');
    httpMock.expectOne(second).flush(new Blob(['y']));

    expect(comp.objectUrl()).toBe('blob:avatar-2');
  });

  /** Change detection fires `ngOnChanges` repeatedly; one path must not mean one request each time. */
  it('should not re-fetch while the path is unchanged', () => {
    comp.imageUrl = CONTENT_PATH;
    comp.ngOnChanges();
    httpMock.expectOne(CONTENT_PATH).flush(new Blob(['x']));

    comp.ngOnChanges();
    comp.ngOnChanges();

    httpMock.expectNone(CONTENT_PATH);
  });
});

/**
 * ⭐ **The banner, with the REAL interceptor in the chain — which the suite above is structurally
 * blind to.**
 *
 * <p>That suite uses `provideHttpClientTesting` with no interceptors at all, so it could never have
 * seen a banner however the request was built: it proves the fallback renders and says nothing about
 * what else the failure does. ⛔ **And the failure it calls ordinary is this very change's**: the
 * avatar upload and the `PUT /api/account` that records its path are two requests, so a failure
 * between them leaves `imageUrl` naming a document that no longer exists. The sidebar hosts this
 * component on **every page of the portal**, so without `SKIP_ERROR_ALERT` that ordinary outcome
 * becomes a session-wide red banner.
 *
 * <p>Asserted twice over, because each catches a different way of losing it: the token is checked on
 * the outgoing request, and `EventManager` is watched for the broadcast `alert-error` actually
 * renders from. A control case flips the token off to prove the probe can see a banner at all — a
 * negative assertion against a listener that never fires is worth nothing.
 */
describe('Account Avatar Component — the error banner', () => {
  let fixture: ComponentFixture<AccountAvatarComponent>;
  let comp: AccountAvatarComponent;
  let httpMock: HttpTestingController;
  let broadcast: jest.Mock;

  beforeEach(async () => {
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = jest.fn().mockReturnValue('blob:avatar-1');
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = jest.fn();
    broadcast = jest.fn();

    await TestBed.configureTestingModule({
      imports: [AccountAvatarComponent, TranslateModule.forRoot()],
      providers: [
        { provide: EventManager, useValue: { broadcast } },
        { provide: HTTP_INTERCEPTORS, useClass: ErrorHandlerInterceptor, multi: true },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AccountAvatarComponent);
    comp = fixture.componentInstance;
  });

  afterEach(() => httpMock.verify());

  it('should set the opt-out token on the blob request', () => {
    comp.imageUrl = CONTENT_PATH;
    comp.ngOnChanges();

    const request = httpMock.expectOne(CONTENT_PATH);
    expect(request.request.context.get(SKIP_ERROR_ALERT)).toBe(true);
    request.flush(new Blob(['x']));
  });

  it('should raise no banner when the avatar is missing', () => {
    comp.imageUrl = CONTENT_PATH;
    comp.ngOnChanges();

    httpMock.expectOne(CONTENT_PATH).flush(new Blob(['gone']), { status: 404, statusText: 'Not Found' });

    expect(broadcast).not.toHaveBeenCalled();
    expect(comp.objectUrl()).toBeNull();
  });

  it('should raise no banner when the content endpoint refuses outright', () => {
    comp.imageUrl = CONTENT_PATH;
    comp.ngOnChanges();

    httpMock.expectOne(CONTENT_PATH).flush(new Blob(['no']), { status: 403, statusText: 'Forbidden' });

    expect(broadcast).not.toHaveBeenCalled();
  });

  /**
   * ⭐ **The control.** Without this, the two negative cases above would pass just as happily against
   * an interceptor that was never in the chain — which is exactly the blindness this block exists to
   * remove, so it is proved rather than assumed.
   */
  it('should raise a banner for the same failure without the token, proving the probe can see one', () => {
    const http = TestBed.inject(HttpClient);

    http.get('services/professionalservice/api/personal-document/doc-9/content', { responseType: 'blob' }).subscribe({
      error: () => undefined,
    });
    httpMock
      .expectOne('services/professionalservice/api/personal-document/doc-9/content')
      .flush(new Blob(['gone']), { status: 404, statusText: 'Not Found' });

    expect(broadcast).toHaveBeenCalled();
  });
});

/**
 * ⛔ **The `alt` is a real translated value in all four locales — and it was NOT, until review.**
 *
 * <p>The template binds `healthConnect.profile.avatar.alt`, and that key existed in no catalogue.
 * ngx-translate renders a missing key **as the key**, so the avatar shipped with
 * `alt="healthConnect.profile.avatar.alt"` — invisible on screen and read out verbatim by a screen
 * reader.
 *
 * <p>⚠ **Four gates were green over it, and each for a reason worth knowing.**
 * `untranslated-literals.spec.ts` checks that a visible attribute goes *through* a translation — it
 * did — and never that the key resolves. `catalogues.spec.ts` compares the locales against *each
 * other*, and the key was missing from all four equally. `translated-values.spec.ts` compares values
 * that exist. And the four-language render cases on the panes read `textContent`, which an attribute
 * is not in. `backlog.md` row 217 is the open row for the gate that would have caught it —
 * `web/` has no `template-keys` spec, which `mobile/` does.
 */
describe('Account Avatar Component — the alt text', () => {
  const catalogue = (locale: string): Record<string, unknown> =>
    JSON.parse(readFileSync(resolve(__dirname, `../../../i18n/${locale}/healthConnect.json`), 'utf8')) as Record<string, unknown>;

  it.each(['en', 'es', 'fr', 'de'])('should render a translated alt in %s rather than the key', async locale => {
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = jest.fn().mockReturnValue('blob:avatar-1');
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = jest.fn();

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AccountAvatarComponent, TranslateModule.forRoot()],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(locale, catalogue(locale));
    translate.use(locale);

    const httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AccountAvatarComponent);
    fixture.componentInstance.imageUrl = CONTENT_PATH;
    fixture.componentInstance.ngOnChanges();
    httpMock.expectOne(CONTENT_PATH).flush(new Blob(['x']));
    fixture.detectChanges();

    const expected = (catalogue(locale) as { healthConnect: { profile: { avatar: { alt: string } } } }).healthConnect.profile.avatar.alt;
    const alt = (fixture.nativeElement as HTMLElement).querySelector('[data-cy="accountAvatarImage"]')!.getAttribute('alt');

    expect(alt).toBe(expected);
    expect(alt).not.toContain('healthConnect.');
    httpMock.verify();
  });
});
