import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { MockHealthConnectRepository } from '../health-connect.repository';
import ActivityLogDialogComponent from './activity-log-dialog.component';

describe('ActivityLogDialogComponent', () => {
  let component: ActivityLogDialogComponent;
  let fixture: ComponentFixture<ActivityLogDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityLogDialogComponent, TranslateModule.forRoot()],
    }).compileComponents();
    fixture = TestBed.createComponent(ActivityLogDialogComponent);
    component = fixture.componentInstance;
    component.patientId = 'patient-kojo';
    TestBed.inject(MockHealthConnectRepository).reset();
    fixture.detectChanges();
  });

  it('provides labelled modal semantics, initial field focus, validation, and Escape dismissal', () => {
    const closed = jest.fn();
    component.closed.subscribe(closed);
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;

    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#hpd-activity-title'));

    component.form.markAllAsTouched();
    component.submitted = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('appends a timestamped entry only after valid input and closes the dialog', () => {
    const closed = jest.fn();
    component.closed.subscribe(closed);
    component.form.setValue({ title: 'Follow up', description: 'Call next of kin.' });

    component.save();

    expect(TestBed.inject(MockHealthConnectRepository).findPatient('patient-kojo')?.activities).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'Follow up', description: 'Call next of kin.' })]),
    );
    expect(closed).toHaveBeenCalledTimes(1);
  });
});
