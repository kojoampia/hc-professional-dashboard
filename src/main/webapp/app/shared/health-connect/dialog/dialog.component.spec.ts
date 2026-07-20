import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { OverlayContainer } from '@angular/cdk/overlay';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';

import ConfirmDialogComponent from './confirm-dialog.component';
import DialogComponent from './dialog.component';
import { HealthConnectDialogService } from './dialog.service';

describe('HealthConnect dialogs', () => {
  it('focuses its close control and emits close for Escape', () => {
    TestBed.configureTestingModule({ imports: [DialogComponent, TranslateModule.forRoot()] });
    const fixture: ComponentFixture<DialogComponent> = TestBed.createComponent(DialogComponent);
    const component = fixture.componentInstance;
    component.titleKey = 'healthConnect.activity.title';
    const close = jest.fn();
    component.closed.subscribe(close);
    fixture.detectChanges();

    component.focusCloseButton();
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('button'));
    fixture.nativeElement.querySelector('section').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(close).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('[role="dialog"]').getAttribute('aria-modal')).toBe('true');
  });

  it('traps focus through Material and restores focus when closed', fakeAsync(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [provideNoopAnimations()],
    });
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const service = TestBed.inject(HealthConnectDialogService);
    const overlay = TestBed.inject(OverlayContainer);
    const ref = service.confirm({
      titleKey: 'healthConnect.patient.copyConfirmation',
      messageKey: 'healthConnect.patient.copyConfirmation',
    });
    const result = jest.fn();
    ref.afterClosed().subscribe(result);
    tick();

    const dialog = overlay.getContainerElement().querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    const container = ref as unknown as { _containerInstance: { _focusTrap: unknown } };
    expect(container._containerInstance._focusTrap).toBeDefined();
    ref.close();
    tick(500);
    expect(result).toHaveBeenCalledWith(undefined);
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  }));

  it('returns false when a confirmation is cancelled', fakeAsync(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [provideNoopAnimations()],
    });
    const service = TestBed.inject(HealthConnectDialogService);
    const ref = service.confirm({ titleKey: 'healthConnect.activity.title', messageKey: 'healthConnect.activity.description' });
    const result = jest.fn();
    ref.afterClosed().subscribe(result);
    const component = ref.componentInstance as ConfirmDialogComponent;

    component.cancel();
    tick(500);
    expect(result).toHaveBeenCalledWith(false);
  }));
});
