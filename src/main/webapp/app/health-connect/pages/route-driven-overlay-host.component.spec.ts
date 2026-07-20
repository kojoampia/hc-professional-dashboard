import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import RouteDrivenOverlayHostComponent from './route-driven-overlay-host.component';

describe('RouteDrivenOverlayHostComponent', () => {
  it('has dialog semantics and returns to the supplied route when closed', () => {
    TestBed.configureTestingModule({
      imports: [RouteDrivenOverlayHostComponent, TranslateModule.forRoot()],
      providers: [provideRouter([])],
    });
    const fixture: ComponentFixture<RouteDrivenOverlayHostComponent> = TestBed.createComponent(RouteDrivenOverlayHostComponent);
    const component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    const navigate = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    component.titleKey = 'healthConnect.patient.record';
    component.closeUrl = '/patients';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]').getAttribute('aria-modal')).toBe('true');
    const closeButton = fixture.nativeElement.querySelectorAll('button')[1] as HTMLButtonElement;
    expect(document.activeElement).toBe(closeButton);
    closeButton.click();
    expect(navigate).toHaveBeenCalledWith('/patients');
  });

  it('supports Escape, focus containment, and browser printing for route-driven patient and case flows', () => {
    TestBed.configureTestingModule({
      imports: [RouteDrivenOverlayHostComponent, TranslateModule.forRoot()],
      providers: [provideRouter([])],
    });
    const fixture: ComponentFixture<RouteDrivenOverlayHostComponent> = TestBed.createComponent(RouteDrivenOverlayHostComponent);
    const component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    const navigate = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const print = jest.spyOn(window, 'print').mockImplementation(() => undefined);
    component.closeUrl = '/cases';
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    const buttons = dialog.querySelectorAll('button');

    component.print();
    expect(print).toHaveBeenCalled();

    (buttons[0] as HTMLButtonElement).focus();
    component.trapFocus(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }));
    expect(document.activeElement).toBe(buttons[1]);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(navigate).toHaveBeenCalledWith('/cases');
  });
});
