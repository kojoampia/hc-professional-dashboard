import { ChangeDetectionStrategy, Component, ElementRef } from '@angular/core';
import { ComponentFixture, TestBed, inject } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FormBuilder } from '@angular/forms';
import { Subject, of, throwError } from 'rxjs';
import { By } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';

import PasswordResetInitComponent from './password-reset-init.component';
import { PasswordResetInitService } from './password-reset-init.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('PasswordResetInitComponent', () => {
  let fixture: ComponentFixture<PasswordResetInitComponent>;
  let comp: PasswordResetInitComponent;

  beforeEach(() => {
    fixture = TestBed.configureTestingModule({
      imports: [PasswordResetInitComponent],
      providers: [FormBuilder, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    })
      .overrideTemplate(PasswordResetInitComponent, '')
      .createComponent(PasswordResetInitComponent);
    comp = fixture.componentInstance;
  });

  it('sets focus after the view has been initialized', () => {
    const node = {
      focus: jest.fn(),
    };
    comp.email = new ElementRef(node);

    comp.ngAfterViewInit();

    expect(node.focus).toHaveBeenCalled();
  });

  it('notifies of success upon successful requestReset', inject([PasswordResetInitService], (service: PasswordResetInitService) => {
    jest.spyOn(service, 'save').mockReturnValue(of({}));
    comp.resetRequestForm.patchValue({
      email: 'user@domain.com',
    });

    comp.requestReset();

    expect(service.save).toHaveBeenCalledWith('user@domain.com');
    expect(comp.success()).toBe(true);
  }));

  it('no notification of success upon error response', inject([PasswordResetInitService], (service: PasswordResetInitService) => {
    jest.spyOn(service, 'save').mockReturnValue(
      throwError({
        status: 503,
        data: 'something else',
      }),
    );
    comp.resetRequestForm.patchValue({
      email: 'user@domain.com',
    });
    comp.requestReset();

    expect(service.save).toHaveBeenCalledWith('user@domain.com');
    expect(comp.success()).toBe(false);
  }));
});

/**
 * Backlog item 47 defect 1: the outcome never reaches the screen.
 *
 * The suite above cannot catch it — it asserts fields, not the DOM, and blanks the template with
 * `.overrideTemplate(..., '')`. Reproducing the defect needs two things that are easy to get wrong,
 * either of which yields a test that passes against the broken code:
 *
 *   1. **The response must arrive after the first render.** A synchronous `of(...)` sets the field
 *      before anything is painted, so the initial render shows the alert and OnPush never enters into
 *      it. The defect is that a *later* write does not mark the view dirty. Hence the Subject.
 *   2. **The component must not be the fixture root.** `ComponentFixture.detectChanges()` forces a
 *      check of its own view regardless of OnPush. Hence the host wrapper.
 *
 * Verified by inversion: with plain fields restored these fail, and the field-based tests above still
 * pass. Asserted on the alert container's class, not its text, so nothing here depends on translation.
 */
@Component({
  imports: [PasswordResetInitComponent],
  template: '<hpd-password-reset-init />',
})
class ResetInitHostComponent {}

describe('PasswordResetInitComponent rendering under OnPush', () => {
  it('renders the success alert only after the server answers', async () => {
    const responses = new Subject<{}>();

    await TestBed.configureTestingModule({
      imports: [ResetInitHostComponent, TranslateModule.forRoot()],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    })
      .overrideComponent(PasswordResetInitComponent, { set: { changeDetection: ChangeDetectionStrategy.OnPush } })
      .compileComponents();

    jest.spyOn(TestBed.inject(PasswordResetInitService), 'save').mockReturnValue(responses.asObservable());

    const fixture = TestBed.createComponent(ResetInitHostComponent);
    fixture.detectChanges();

    const comp = fixture.debugElement.query(By.directive(PasswordResetInitComponent)).componentInstance;
    comp.resetRequestForm.patchValue({ email: 'ama@localhost' });
    comp.requestReset();
    fixture.detectChanges();

    // Still in flight: the form is up, no outcome claimed yet.
    expect(fixture.nativeElement.querySelector('.bg-hpd-success-tint')).toBeNull();

    responses.next({});
    responses.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.bg-hpd-success-tint')).not.toBeNull();
  });
});
