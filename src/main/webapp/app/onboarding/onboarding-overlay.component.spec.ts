import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import OnboardingOverlayComponent from './onboarding-overlay.component';
import RouteDrivenOverlayHostComponent from 'app/health-connect/pages/route-driven-overlay-host.component';
import { FakeHealthConnectRepository } from 'app/health-connect/testing/fake-health-connect.repository';
import { HEALTH_CONNECT_REPOSITORY } from 'app/health-connect/health-connect.repository';

/**
 * `backlog.md` row 247 — `profile.md:162`: *"The dialog panel cannot be closed or printed."*
 *
 * <p>⚠ **The absence cases are paired with a control that proves the probe can see the thing it
 * claims is missing.** An assertion that no button says "close" passes just as well against a
 * component that renders nothing at all, against a renamed translation key, and against a template
 * that silently failed to compile — which is how an absence test quietly stops testing. So the first
 * case asserts the shared host it replaces **does** carry both controls, from the same queries. If
 * the mechanism ever stops finding buttons, that case goes red and names the reason.
 */
describe('OnboardingOverlayComponent', () => {
  const createOverlay = (): ComponentFixture<OnboardingOverlayComponent> => {
    TestBed.configureTestingModule({
      imports: [OnboardingOverlayComponent, TranslateModule.forRoot()],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(OnboardingOverlayComponent);
    fixture.componentInstance.titleKey = 'healthConnect.onboarding.wizard.account.title';
    fixture.detectChanges();
    return fixture;
  };

  /**
   * The control, and the reason it is here rather than in the shared host's own spec: it states what
   * this component is defined against. Row 247's whole content is *these two controls, on these
   * panes, gone* — a reader who finds only the negative cases below cannot tell whether they
   * describe a removal or a component that never had them.
   */
  it('should confirm the shared overlay host — the one these panes used — does render close and print', () => {
    TestBed.configureTestingModule({
      imports: [RouteDrivenOverlayHostComponent, TranslateModule.forRoot()],
      providers: [{ provide: HEALTH_CONNECT_REPOSITORY, useExisting: FakeHealthConnectRepository }, provideRouter([])],
    });
    const fixture: ComponentFixture<RouteDrivenOverlayHostComponent> = TestBed.createComponent(RouteDrivenOverlayHostComponent);
    fixture.componentInstance.titleKey = 'healthConnect.patient.record';
    fixture.componentInstance.closeUrl = '/patients';
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('[role="dialog"] button');
    expect(buttons.length).toBe(2);
    expect(typeof (fixture.componentInstance as { close?: unknown }).close).toBe('function');
    expect(typeof (fixture.componentInstance as { print?: unknown }).print).toBe('function');
  });

  it('should render no close and no print control', () => {
    const fixture = createOverlay();

    expect(fixture.nativeElement.querySelectorAll('[role="dialog"] button').length).toBe(0);
    expect(fixture.nativeElement.textContent).not.toContain('healthConnect.actions.close');
    expect(fixture.nativeElement.textContent).not.toContain('healthConnect.actions.print');
  });

  /**
   * ⚠ **A close method would be reachable whatever the template renders.** The host's `close()` is
   * public and its Escape binding called it; a replacement that dropped only the markup would still
   * let any future template — or a test — close the pane. Asserted on the instance, not the DOM.
   */
  it('should expose no way to close or print the pane', () => {
    const fixture = createOverlay();
    const instance = fixture.componentInstance as unknown as Record<string, unknown>;

    expect(instance.close).toBeUndefined();
    expect(instance.print).toBeUndefined();
    expect(instance.closeUrl).toBeUndefined();
  });

  /**
   * Escape is the control that is easiest to leave behind, because nothing on screen shows it. The
   * host bound `(keydown.escape)="close()"`; dispatching the same event here must do nothing at all.
   */
  it('should ignore Escape rather than leaving the pane', () => {
    const fixture = createOverlay();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;

    expect(() => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))).not.toThrow();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
  });

  /**
   * ⛔ Removing the chrome must not remove the dialog. The focus trap is what makes the page behind
   * an unclosable overlay inert to a keyboard and a screen reader, so it is asserted here rather
   * than assumed to have travelled with the copied markup.
   */
  it('should keep dialog semantics, label the heading, and focus the dialog itself', () => {
    const fixture = createOverlay();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;

    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('hpd-onboarding-overlay-title');
    expect(dialog.querySelector('#hpd-onboarding-overlay-title')).not.toBeNull();
    // The dialog, not a button — there is no button to focus, and the heading says which step this is.
    expect(document.activeElement).toBe(dialog);
  });

  it('should wrap focus within the dialog', () => {
    const fixture = createOverlay();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    const first = document.createElement('button');
    const last = document.createElement('button');
    dialog.append(first, last);
    last.focus();

    fixture.componentInstance.trapFocus(new KeyboardEvent('keydown', { key: 'Tab' }));

    expect(document.activeElement).toBe(first);
  });
});
