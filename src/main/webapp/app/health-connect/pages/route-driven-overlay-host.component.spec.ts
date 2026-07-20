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
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('button'));
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(navigate).toHaveBeenCalledWith('/patients');
  });
});
