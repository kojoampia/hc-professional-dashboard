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
