import { ChangeDetectionStrategy, Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed, waitForAsync, inject, tick, fakeAsync } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FormBuilder } from '@angular/forms';
import { Subject, of, throwError } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { EMAIL_ALREADY_USED_TYPE, LOGIN_ALREADY_USED_TYPE } from 'app/config/error.constants';

import { RegisterService } from './register.service';
import RegisterComponent from './register.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let comp: RegisterComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), RegisterComponent],
      providers: [
        FormBuilder,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
      ],
    })
      .overrideTemplate(RegisterComponent, '')
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RegisterComponent);
    comp = fixture.componentInstance;
  });

  it('should ensure the two passwords entered match', () => {
    comp.registerForm.patchValue({
      password: 'password',
      confirmPassword: 'non-matching',
    });

    comp.register();

    expect(comp.doNotMatch()).toBe(true);
  });

  it('should update success to true after creating an account', inject(
    [RegisterService, TranslateService],
    fakeAsync((service: RegisterService, mockTranslateService: TranslateService) => {
      jest.spyOn(service, 'save').mockReturnValue(of({}));
      mockTranslateService.currentLang = 'en';
      comp.registerForm.patchValue({
        password: 'password',
        confirmPassword: 'password',
      });

      comp.register();
      tick();

      expect(service.save).toHaveBeenCalledWith({
        email: '',
        password: 'password',
        login: '',
        langKey: 'en',
      });
      expect(comp.success()).toBe(true);
      expect(comp.errorUserExists()).toBe(false);
      expect(comp.errorEmailExists()).toBe(false);
      expect(comp.error()).toBe(false);
    }),
  ));

  it('should notify of user existence upon 400/login already in use', inject(
    [RegisterService],
    fakeAsync((service: RegisterService) => {
      jest.spyOn(service, 'save').mockReturnValue(
        throwError({
          status: 400,
          error: { type: LOGIN_ALREADY_USED_TYPE },
        }),
      );
      comp.registerForm.patchValue({
        password: 'password',
        confirmPassword: 'password',
      });

      comp.register();
      tick();

      expect(comp.errorUserExists()).toBe(true);
      expect(comp.errorEmailExists()).toBe(false);
      expect(comp.error()).toBe(false);
    }),
  ));

  it('should notify of email existence upon 400/email address already in use', inject(
    [RegisterService],
    fakeAsync((service: RegisterService) => {
      jest.spyOn(service, 'save').mockReturnValue(
        throwError({
          status: 400,
          error: { type: EMAIL_ALREADY_USED_TYPE },
        }),
      );
      comp.registerForm.patchValue({
        password: 'password',
        confirmPassword: 'password',
      });

      comp.register();
      tick();

      expect(comp.errorEmailExists()).toBe(true);
      expect(comp.errorUserExists()).toBe(false);
      expect(comp.error()).toBe(false);
    }),
  ));

  describe('login availability look-ahead', () => {
    const type = (value: string): void => comp.registerForm.controls.login.setValue(value);

    it('should mark a free login as available', inject(
      [RegisterService],
      fakeAsync((service: RegisterService) => {
        jest.spyOn(service, 'checkLoginAvailability').mockReturnValue(of({ login: 'jdoe', available: true, suggestions: [] }));
        comp.ngOnInit();

        type('jdoe');
        tick(350);

        expect(comp.loginStatus).toBe('available');
        expect(comp.loginSuggestions).toEqual([]);
      }),
    ));

    it('should mark a taken login and offer the alternatives', inject(
      [RegisterService],
      fakeAsync((service: RegisterService) => {
        jest
          .spyOn(service, 'checkLoginAvailability')
          .mockReturnValue(of({ login: 'jdoe', available: false, suggestions: ['jdoe1', 'jdoe2'] }));
        comp.ngOnInit();

        type('jdoe');
        tick(350);

        expect(comp.loginStatus).toBe('taken');
        expect(comp.loginSuggestions).toEqual(['jdoe1', 'jdoe2']);
      }),
    ));

    it('should debounce, so typing a name is one request and not one per keystroke', inject(
      [RegisterService],
      fakeAsync((service: RegisterService) => {
        const check = jest
          .spyOn(service, 'checkLoginAvailability')
          .mockReturnValue(of({ login: 'jdoe', available: true, suggestions: [] }));
        comp.ngOnInit();

        type('j');
        tick(100);
        type('jd');
        tick(100);
        type('jdoe');
        tick(350);

        expect(check).toHaveBeenCalledTimes(1);
        expect(check).toHaveBeenCalledWith('jdoe');
      }),
    ));

    it('should not query a login the field itself rejects', inject(
      [RegisterService],
      fakeAsync((service: RegisterService) => {
        const check = jest.spyOn(service, 'checkLoginAvailability');
        comp.ngOnInit();

        // Spaces and '!' fail the control's own pattern; the server would answer 400.
        type('not valid!');
        tick(350);

        expect(check).not.toHaveBeenCalled();
        expect(comp.loginStatus).toBe('idle');
      }),
    ));

    it('should ignore an answer that no longer describes the field', inject(
      [RegisterService],
      fakeAsync((service: RegisterService) => {
        // A slow reply for an earlier value must not paint a verdict for what is in the box now.
        jest.spyOn(service, 'checkLoginAvailability').mockReturnValue(of({ login: 'stale', available: true, suggestions: [] }));
        comp.ngOnInit();

        type('jdoe');
        tick(350);

        expect(comp.loginStatus).toBe('checking');
      }),
    ));

    it('should report a failed check as unknown rather than taken', inject(
      [RegisterService],
      fakeAsync((service: RegisterService) => {
        // Colouring the field red on a network blip would push people into renaming a fine login.
        jest.spyOn(service, 'checkLoginAvailability').mockReturnValue(throwError(() => new Error('offline')));
        comp.ngOnInit();

        type('jdoe');
        tick(350);

        expect(comp.loginStatus).toBe('error');
        expect(comp.loginSuggestions).toEqual([]);
      }),
    ));

    it('should adopt a suggestion into the field', inject(
      [RegisterService],
      fakeAsync((service: RegisterService) => {
        jest.spyOn(service, 'checkLoginAvailability').mockReturnValue(of({ login: 'jdoe1', available: true, suggestions: [] }));
        comp.ngOnInit();

        comp.useSuggestion('jdoe1');
        tick(350);

        expect(comp.registerForm.controls.login.value).toBe('jdoe1');
        expect(comp.loginStatus).toBe('available');
      }),
    ));
  });

  it('should notify of generic error', inject(
    [RegisterService],
    fakeAsync((service: RegisterService) => {
      jest.spyOn(service, 'save').mockReturnValue(
        throwError({
          status: 503,
        }),
      );
      comp.registerForm.patchValue({
        password: 'password',
        confirmPassword: 'password',
      });

      comp.register();
      tick();

      expect(comp.errorUserExists()).toBe(false);
      expect(comp.errorEmailExists()).toBe(false);
      expect(comp.error()).toBe(true);
    }),
  ));
});

/**
 * Backlog item 47 defect 1: the outcome never reaches the screen.
 *
 * The suite above cannot catch it — it asserts fields, not the DOM, and blanks the template with
 * `.overrideTemplate(..., '')`. Two things are needed to reproduce the defect, and getting either
 * wrong yields a test that passes against the broken code:
 *
 *   1. **The response must arrive after the first render.** A synchronous `of(...)` sets the field
 *      before anything is painted, so the initial render shows the alert and OnPush never enters into
 *      it. The defect is that a *later* write does not mark the view dirty. Hence the Subject.
 *   2. **The component must not be the fixture root.** `ComponentFixture.detectChanges()` forces a
 *      check of its own view regardless of OnPush. Hence the host wrapper.
 *
 * Verified by inversion: with plain fields restored these fail while the field-based tests above still
 * pass. Asserted on the alert container's class, not its text, so nothing here depends on translation.
 */
@Component({
  imports: [RegisterComponent],
  template: '<hpd-register />',
})
class RegisterHostComponent {}

describe('RegisterComponent rendering under OnPush', () => {
  const render = async () => {
    const responses = new Subject<{}>();

    await TestBed.configureTestingModule({
      imports: [RegisterHostComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) }, queryParams: of({}) } },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    })
      .overrideComponent(RegisterComponent, { set: { changeDetection: ChangeDetectionStrategy.OnPush } })
      .compileComponents();

    jest.spyOn(TestBed.inject(RegisterService), 'save').mockReturnValue(responses.asObservable());

    const fixture = TestBed.createComponent(RegisterHostComponent);
    fixture.detectChanges();

    const comp = fixture.debugElement.query(By.directive(RegisterComponent)).componentInstance;
    comp.registerForm.patchValue({
      login: 'ama.serwaa',
      email: 'ama@localhost',
      password: 'Passw0rd!',
      confirmPassword: 'Passw0rd!',
    });
    comp.register();
    fixture.detectChanges();

    return { fixture, responses };
  };

  afterEach(() => TestBed.resetTestingModule());

  it('renders the success alert when registration is accepted', async () => {
    const { fixture, responses } = await render();

    expect(fixture.nativeElement.querySelector('.bg-hpd-success-tint')).toBeNull();

    responses.next({});
    responses.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.bg-hpd-success-tint')).not.toBeNull();
  });

  it('renders the login-already-used alert rather than nothing', async () => {
    const { fixture, responses } = await render();

    // The reporter hit this screen first: the same defect one step before activation.
    responses.error({ status: 400, error: { type: LOGIN_ALREADY_USED_TYPE } });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.bg-hpd-danger-tint')).not.toBeNull();
  });
});
