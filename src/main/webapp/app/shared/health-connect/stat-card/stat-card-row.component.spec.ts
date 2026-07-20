import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import StatCardRowComponent from './stat-card-row.component';

describe('StatCardRowComponent', () => {
  let component: StatCardRowComponent;
  let fixture: ComponentFixture<StatCardRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCardRowComponent, TranslateModule.forRoot()],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(StatCardRowComponent);
    component = fixture.componentInstance;
    component.cards = [
      { id: 'open', labelKey: 'healthConnect.stats.open', count: 1, variant: 'open' },
      { id: 'urgent', labelKey: 'healthConnect.stats.urgent', count: 2, variant: 'urgent' },
    ];
  });

  it('presents a list and emits the selected card intent', () => {
    const selected = jest.fn();
    component.selected.subscribe(selected);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="list"]')).not.toBeNull();
    (fixture.nativeElement.querySelectorAll('button')[1] as HTMLButtonElement).click();
    expect(selected).toHaveBeenCalledWith('urgent');
  });
});
