import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import StatCardComponent from './stat-card.component';

describe('StatCardComponent', () => {
  let component: StatCardComponent;
  let fixture: ComponentFixture<StatCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCardComponent, TranslateModule.forRoot()],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(StatCardComponent);
    component = fixture.componentInstance;
    component.labelKey = 'healthConnect.stats.urgent';
    component.count = 2;
  });

  it('renders an accessible selected button and emits keyboard activation', () => {
    const activated = jest.fn();
    component.selected = true;
    component.activate.subscribe(activated);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.classList).toContain('hpd-focusable');
    expect(button.textContent).toContain('2');
    button.click();
    expect(activated).toHaveBeenCalledTimes(1);
  });

  it('uses a semantic link when a navigation target is supplied', () => {
    component.link = '/patients';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });
});
