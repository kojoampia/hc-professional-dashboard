import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { ASYNC_STATUSES, AsyncStatus } from 'app/health-connect/health-connect.models';
import { FakeHealthConnectRepository } from 'app/health-connect/testing/fake-health-connect.repository';
import { HEALTH_CONNECT_REPOSITORY } from 'app/health-connect/health-connect.repository';

import AsyncStateComponent from './async-state.component';
import LoadingSkeletonComponent from './loading-skeleton.component';

describe('HealthConnect asynchronous state components', () => {
  it('presents a labelled loading skeleton', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: HEALTH_CONNECT_REPOSITORY, useExisting: FakeHealthConnectRepository }],
      imports: [LoadingSkeletonComponent, TranslateModule.forRoot()],
    });
    const fixture: ComponentFixture<LoadingSkeletonComponent> = TestBed.createComponent(LoadingSkeletonComponent);
    fixture.componentInstance.count = 2;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.hpd-loading-skeleton__line')).toHaveLength(2);
  });

  it('renders empty and retryable error states in a polite live region', () => {
    TestBed.configureTestingModule({ imports: [AsyncStateComponent, TranslateModule.forRoot()] });
    const fixture: ComponentFixture<AsyncStateComponent> = TestBed.createComponent(AsyncStateComponent);
    const component = fixture.componentInstance;
    const retry = jest.fn();
    component.retry.subscribe(retry);
    component.status = 'error';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-live="polite"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(retry).toHaveBeenCalledTimes(1);

    component.status = 'ready';
    component.empty = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('accepts loading and error state supplied by the mock repository boundary', () => {
    TestBed.configureTestingModule({ imports: [AsyncStateComponent, TranslateModule.forRoot()] });
    const repository = TestBed.inject(FakeHealthConnectRepository);
    const fixture: ComponentFixture<AsyncStateComponent> = TestBed.createComponent(AsyncStateComponent);
    repository.setReadState('caseQueue', { status: 'loading', error: null });
    fixture.componentInstance.status = repository.caseQueueState().status;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();

    repository.setReadState('caseQueue', { status: 'error', error: 'mock failure' });
    fixture.componentRef.setInput('status', repository.caseQueueState().status);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('OFFERS NO RETRY for a refusal, and does not dress it as a failure', () => {
    // The Done-when's third clause (item 146). hc-patient refuses a technician the case read on
    // every load, so the Retry the error panel offers re-issues the same 403 for ever — a permission
    // decision rendered as a transient fault. role="status", not role="alert": nothing went wrong.
    TestBed.configureTestingModule({ imports: [AsyncStateComponent, TranslateModule.forRoot()] });
    const fixture: ComponentFixture<AsyncStateComponent> = TestBed.createComponent(AsyncStateComponent);
    fixture.componentRef.setInput('status', 'forbidden');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-cy="asyncForbidden"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('healthConnect.states.forbidden');
  });

  it('STILL blanks and still offers a Retry for a genuine outage', () => {
    // The inverse, and the reason it is a test of its own: "never blank anything" would satisfy
    // every other assertion in this file and would be the wrong fix. A 503 IS transient, the panel
    // IS the right screen, and Retry is the right offer.
    TestBed.configureTestingModule({ imports: [AsyncStateComponent, TranslateModule.forRoot()] });
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    fixture.componentInstance.status = 'error';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-cy="projected"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('button')).not.toBeNull();
  });

  describe('what may reach the projected content', () => {
    // The trap this guards: the content used to be projected by a BARE @else, so every status the
    // component did not branch on rendered the wrapped table exactly as though the read had
    // succeeded. Adding `forbidden` to AsyncStatus was the change that would have done it —
    // silently, with no error anywhere, a refused case queue on screen as a healthy one.
    //
    // Enumerated from ASYNC_STATUSES rather than listed here, so a member added later is covered by
    // a test nobody remembered to update. That is why the union is derived from a runtime array.
    const CONTENT_STATUSES: readonly AsyncStatus[] = ['idle', 'ready'];

    it.each(ASYNC_STATUSES.map(status => [status] as const))('renders a recognised panel for %s', status => {
      TestBed.configureTestingModule({ imports: [AsyncStateComponent, TranslateModule.forRoot()] });
      const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
      fixture.componentInstance.status = status;
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-cy="projected"]') !== null).toBe(CONTENT_STATUSES.includes(status));
      // Whatever it rendered, it was chosen: nothing falls into the unrecognised-status branch.
      expect(fixture.nativeElement.querySelector('[data-cy="asyncUnknownStatus"]')).toBeNull();
    });

    it('FAILS CLOSED on a status it does not know, rather than rendering the content', () => {
      // The cast is the whole point: this is the shape of a member added to AsyncStatus without a
      // branch here, and what must never happen is the wrapped table rendering as if it had loaded.
      TestBed.configureTestingModule({ imports: [AsyncStateComponent, TranslateModule.forRoot()] });
      const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
      fixture.componentInstance.status = 'partial' as AsyncStatus;
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-cy="projected"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-cy="asyncUnknownStatus"]')).not.toBeNull();
    });
  });
});

/** A wrapper with something to project, which is the only way to see what reaches `<ng-content />`. */
@Component({
  standalone: true,
  imports: [AsyncStateComponent],
  template: `<hpd-async-state [status]="status"><p data-cy="projected">a row</p></hpd-async-state>`,
})
class HostComponent {
  status: AsyncStatus = 'ready';
}
