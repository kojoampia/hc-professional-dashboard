import { ComponentFixture, TestBed, waitForAsync, tick, fakeAsync, inject } from '@angular/core/testing';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { ActivateService } from './activate.service';
import ActivateComponent from './activate.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('ActivateComponent', () => {
  let comp: ActivateComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ActivateComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({ key: 'ABC123' }) },
        },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    })
      .overrideTemplate(ActivateComponent, '')
      .compileComponents();
  }));

  beforeEach(() => {
    const fixture = TestBed.createComponent(ActivateComponent);
    comp = fixture.componentInstance;
  });

  it('calls activate.get with the key from params', inject(
    [ActivateService],
    fakeAsync((service: ActivateService) => {
      jest.spyOn(service, 'get').mockReturnValue(of());

      comp.ngOnInit();
      tick();

      expect(service.get).toHaveBeenCalledWith('ABC123');
    }),
  ));

  it('should set set success to true upon successful activation', inject(
    [ActivateService],
    fakeAsync((service: ActivateService) => {
      jest.spyOn(service, 'get').mockReturnValue(of({}));

      comp.ngOnInit();
      tick();

      expect(comp.error()).toBe(false);
      expect(comp.success()).toBe(true);
    }),
  ));

  it('should set set error to true upon activation failure', inject(
    [ActivateService],
    fakeAsync((service: ActivateService) => {
      jest.spyOn(service, 'get').mockReturnValue(throwError('ERROR'));

      comp.ngOnInit();
      tick();

      expect(comp.error()).toBe(true);
      expect(comp.success()).toBe(false);
    }),
  ));
});

/**
 * The regression suite for backlog item 47 defect 1.
 *
 * The suite above could not have caught that defect for two independent reasons: it asserts the
 * component's fields rather than the DOM, and it calls `.overrideTemplate(ActivateComponent, '')`, so
 * the real template never rendered at all.
 *
 * Reproducing it takes more care than it looks. Two things have to be true at once, and getting either
 * wrong yields a test that passes against the broken code:
 *
 *   1. **The response must arrive after the first render.** With a synchronous `of({})` the field is
 *      already set before anything is painted, so the initial render shows the alert and OnPush never
 *      enters into it. The bug is that a *later* write does not mark the view dirty. Hence the Subject.
 *   2. **The component must not be the fixture root.** `ComponentFixture.detectChanges()` calls
 *      `detectChanges()` on its own view, which forces a check regardless of OnPush — so an OnPush
 *      component at the root of a fixture re-renders anyway. Hence the host wrapper: the host is
 *      checked, and the OnPush child is only re-rendered if something marked it dirty.
 *
 * Both were verified by inversion: with plain fields restored, these three fail and the three above
 * still pass.
 *
 * Asserted on the alert container's class rather than its text, so the test says nothing about
 * translation — a missing i18n key is a different defect with its own gate.
 */
@Component({
  imports: [ActivateComponent],
  template: '<hpd-activate />',
})
class ActivateHostComponent {}

describe('ActivateComponent rendering under OnPush', () => {
  let responses: Subject<object>;

  const render = async () => {
    responses = new Subject<object>();

    await TestBed.configureTestingModule({
      imports: [ActivateHostComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParams: of({ key: 'ABC123' }) } },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    })
      // The real parent, AuthShellComponent, is OnPush. This puts the component under the same rule.
      .overrideComponent(ActivateComponent, { set: { changeDetection: ChangeDetectionStrategy.OnPush } })
      .compileComponents();

    jest.spyOn(TestBed.inject(ActivateService), 'get').mockReturnValue(responses.asObservable());

    const fixture = TestBed.createComponent(ActivateHostComponent);
    fixture.detectChanges(); // first paint: the card exists, no outcome yet
    return fixture;
  };

  const alerts = (fixture: ComponentFixture<ActivateHostComponent>): NodeList =>
    fixture.nativeElement.querySelectorAll('.bg-hpd-success-tint, .bg-hpd-danger-tint');

  afterEach(() => TestBed.resetTestingModule());

  it('shows no outcome before the server answers', async () => {
    const fixture = await render();

    expect(alerts(fixture)).toHaveLength(0);
  });

  it('renders the success alert when the key is accepted, after the first render', async () => {
    const fixture = await render();

    responses.next({});
    responses.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.bg-hpd-success-tint')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.bg-hpd-danger-tint')).toBeNull();
  });

  it('renders the error alert when the key is refused, after the first render', async () => {
    const fixture = await render();

    responses.error('ERROR');
    fixture.detectChanges();

    // The reported symptom was a heading with two empty comment anchors and no alert of either kind:
    // the person assumed it had failed, clicked again, and the second click 500d on a consumed key.
    expect(fixture.nativeElement.querySelector('.bg-hpd-danger-tint')).not.toBeNull();
    expect(alerts(fixture)).toHaveLength(1);
  });
});
