import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { MockHealthConnectRepository } from 'app/health-connect/health-connect.repository';

import AsyncStateComponent from './async-state.component';
import LoadingSkeletonComponent from './loading-skeleton.component';

describe('HealthConnect asynchronous state components', () => {
  it('presents a labelled loading skeleton', () => {
    TestBed.configureTestingModule({ imports: [LoadingSkeletonComponent, TranslateModule.forRoot()] });
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
    const repository = TestBed.inject(MockHealthConnectRepository);
    const fixture: ComponentFixture<AsyncStateComponent> = TestBed.createComponent(AsyncStateComponent);
    repository.setLoading(true);
    fixture.componentInstance.status = repository.asyncState().status;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();

    repository.setLoading(false);
    repository.setError('mock failure');
    fixture.componentRef.setInput('status', repository.asyncState().status);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  });
});
