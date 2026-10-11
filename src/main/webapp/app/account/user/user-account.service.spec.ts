import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Account } from 'app/core/auth/account.model';
import { UserAccountService } from './user-account.service';

const account = (): Account =>
  new Account(
    true,
    ['ROLE_USER'],
    'ama@example.com',
    'Ama',
    'en',
    'Mensah',
    'ama',
    'services/professionalservice/api/personal-document/d1/content',
  );

describe('UserAccountService', () => {
  let service: UserAccountService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(UserAccountService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  /**
   * ⚠ `PUT`, and on the **gateway** base — no `services/professionalservice/` prefix. The account is
   * the gateway's `User`; only the avatar bytes live in `api/`.
   */
  it('should PUT the account to the gateway base', () => {
    service.updateUserAccount(account()).subscribe();

    const request = httpMock.expectOne(req => req.method === 'PUT');
    expect(request.request.url).toBe('api/account');
    expect(request.request.url).not.toContain('professionalservice');
    request.flush(null);
  });

  /**
   * ⛔ **Not the deprecated `POST`.** `AccountService.save()` is that verb, retiring in T6 with
   * `SettingsComponent`; `profile.md:181` names `updateUserAccount`, and a new pane must not acquire
   * a dying caller.
   */
  it('should not use the deprecated POST verb', () => {
    service.updateUserAccount(account()).subscribe();

    httpMock.expectNone(req => req.method === 'POST');
    httpMock.expectOne(req => req.method === 'PUT').flush(null);
  });

  /**
   * The whole document, because the handler binds `@Valid AdminUserDTO` and `login` is `@NotBlank`
   * with a pattern — a body carrying only the edited fields is a 400. Sending the other four is
   * harmless because `ownAccountUpdate` reads five getters by name and passes them to the narrow
   * `updateUser`, never the overload that refills the authority set from the body.
   */
  it('should send the whole account document, including the fields the endpoint does not read', () => {
    service.updateUserAccount(account()).subscribe();

    const request = httpMock.expectOne(req => req.method === 'PUT');
    expect(request.request.body).toEqual(
      expect.objectContaining({
        login: 'ama',
        firstName: 'Ama',
        lastName: 'Mensah',
        email: 'ama@example.com',
        langKey: 'en',
        imageUrl: 'services/professionalservice/api/personal-document/d1/content',
      }),
    );
    request.flush(null);
  });
});
