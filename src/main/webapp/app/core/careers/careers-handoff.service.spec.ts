import { TestBed } from '@angular/core/testing';
import { convertToParamMap } from '@angular/router';

import { CareersHandoffService } from './careers-handoff.service';

describe('CareersHandoffService (careers handoff contract)', () => {
  let service: CareersHandoffService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CareersHandoffService);
    localStorage.clear();
  });

  it('captures the documented three-parameter link', () => {
    const handoff = service.capture(convertToParamMap({ track: 'ROLE_NURSE', locale: 'fr', src: 'web-careers' }));
    expect(handoff).toMatchObject({ track: 'ROLE_NURSE', locale: 'fr', src: 'web-careers' });
    expect(service.peek()).toMatchObject({ track: 'ROLE_NURSE', locale: 'fr', src: 'web-careers' });
  });

  it('captures locale=es now that Spanish is a portal language', () => {
    expect(service.capture(convertToParamMap({ locale: 'es' }))?.locale).toBe('es');
  });

  it('drops unknown track values instead of failing (known-set rule)', () => {
    const handoff = service.capture(convertToParamMap({ track: 'ROLE_WIZARD', src: 'web-careers' }));
    expect(handoff?.track).toBeNull();
    expect(handoff?.src).toBe('web-careers');
  });

  /**
   * `?track=ROLE_ANGEL` was a valid track until 2026-09-08 and is now an unknown value.
   *
   * The careers site is a separate repository on a separate deploy cadence (`hc-abofonsa-web`), so a
   * link naming the retired track can go on being clicked for as long as its CMS holds one. The
   * contract's rule covers it exactly — a value outside the known set is dropped and the page still
   * works — and `KNOWN_TRACKS` derives from the `Authority` enum, so removing the member was the whole
   * change. This asserts the graceful degradation rather than the enum: what must not happen is an
   * error, and what must happen is that the rest of the handoff survives.
   */
  it('drops the retired care-angel track without failing, keeping the other parameters', () => {
    const handoff = service.capture(convertToParamMap({ track: 'ROLE_ANGEL', locale: 'fr', src: 'web-careers' }));

    expect(handoff?.track).toBeNull();
    expect(handoff?.locale).toBe('fr');
    expect(handoff?.src).toBe('web-careers');
  });

  it('never accepts admin/user authorities as a track', () => {
    expect(service.capture(convertToParamMap({ track: 'ROLE_ADMIN' }))).toBeNull();
    expect(service.capture(convertToParamMap({ track: 'ROLE_USER' }))).toBeNull();
  });

  it('returns null and stores nothing for a bare URL (graceful degradation)', () => {
    expect(service.capture(convertToParamMap({}))).toBeNull();
    expect(service.peek()).toBeNull();
  });

  it('consume() reads once and clears', () => {
    service.capture(convertToParamMap({ track: 'ROLE_DOCTOR', src: 'web-careers' }));
    expect(service.consume()?.track).toBe('ROLE_DOCTOR');
    expect(service.peek()).toBeNull();
  });

  it('truncates oversized src values', () => {
    const handoff = service.capture(convertToParamMap({ src: 'x'.repeat(200) }));
    expect(handoff?.src).toHaveLength(64);
  });
});
