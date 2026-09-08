import { ChangeDetectionStrategy, Component, ElementRef } from '@angular/core';
import { ComponentFixture, TestBed, inject, tick, fakeAsync } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { By } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';

import PasswordResetFinishComponent from './password-reset-finish.component';
import { PasswordResetFinishService } from './password-reset-finish.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('PasswordResetFinishComponent', () => {
  let fixture: ComponentFixture<PasswordResetFinishComponent>;
  let comp: PasswordResetFinishComponent;

  beforeEach(() => {
    fixture = TestBed.configureTestingModule({
      imports: [PasswordResetFinishComponent],
      providers: [
        FormBuilder,
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({ key: 'XYZPDQ' }) },
        },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    })
      .overrideTemplate(PasswordResetFinishComponent, '')
      .createComponent(PasswordResetFinishComponent);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PasswordResetFinishComponent);
    comp = fixture.componentInstance;
    comp.ngOnInit();
  });

  it('should define its initial state', () => {
    expect(comp.initialized()).toBe(true);
    expect(comp.key).toEqual('XYZPDQ');
  });

  it('sets focus after the view has been initialized', () => {
    const node = {
      focus: jest.fn(),
    };
    comp.newPassword = new ElementRef(node);

    comp.ngAfterViewInit();

    expect(node.focus).toHaveBeenCalled();
  });

  it('should ensure the two passwords entered match', () => {
    comp.passwordForm.patchValue({
      newPassword: 'password',
      confirmPassword: 'non-matching',
    });

    comp.finishReset();

    expect(comp.doNotMatch()).toBe(true);
  });

  it('should update success to true after resetting password', inject(
    [PasswordResetFinishService],
    fakeAsync((service: PasswordResetFinishService) => {
      jest.spyOn(service, 'save').mockReturnValue(of({}));
      comp.passwordForm.patchValue({
        newPassword: 'password',
        confirmPassword: 'password',
      });

      comp.finishReset();
      tick();

      expect(service.save).toHaveBeenCalledWith('XYZPDQ', 'password');
      expect(comp.success()).toBe(true);
    }),
  ));

  it('should notify of generic error', inject(
    [PasswordResetFinishService],
    fakeAsync((service: PasswordResetFinishService) => {
      jest.spyOn(service, 'save').mockReturnValue(throwError('ERROR'));
      comp.passwordForm.patchValue({
        newPassword: 'password',
        confirmPassword: 'password',
      });

      comp.finishReset();
      tick();

      expect(service.save).toHaveBeenCalledWith('XYZPDQ', 'password');
      expect(comp.success()).toBe(false);
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
  imports: [PasswordResetFinishComponent],
  template: '<hpd-password-reset-finish />',
})
class ResetFinishHostComponent {}

describe('PasswordResetFinishComponent rendering under OnPush', () => {
  const render = async () => {
    const responses = new Subject<{}>();

    await TestBed.configureTestingModule({
      imports: [ResetFinishHostComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParams: of({ key: 'RESET-KEY' }) } },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    })
      .overrideComponent(PasswordResetFinishComponent, { set: { changeDetection: ChangeDetectionStrategy.OnPush } })
      .compileComponents();

    jest.spyOn(TestBed.inject(PasswordResetFinishService), 'save').mockReturnValue(responses.asObservable());

    const fixture = TestBed.createComponent(ResetFinishHostComponent);
    fixture.detectChanges();

    const comp = fixture.debugElement.query(By.directive(PasswordResetFinishComponent)).componentInstance;
    comp.passwordForm.patchValue({ newPassword: 'Passw0rd!', confirmPassword: 'Passw0rd!' });
    comp.finishReset();
    fixture.detectChanges();

    return { fixture, responses };
  };

  afterEach(() => TestBed.resetTestingModule());

  it('renders the success alert when the reset is accepted', async () => {
    const { fixture, responses } = await render();

    expect(fixture.nativeElement.querySelector('.bg-hpd-success-tint')).toBeNull();

    responses.next({});
    responses.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.bg-hpd-success-tint')).not.toBeNull();
  });

  it('renders the error alert when the reset is refused', async () => {
    const { fixture, responses } = await render();

    responses.error('ERROR');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.bg-hpd-danger-tint')).not.toBeNull();
  });
});
