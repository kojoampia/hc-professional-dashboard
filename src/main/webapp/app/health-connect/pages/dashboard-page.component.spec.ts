import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { MockHealthConnectRepository } from '../health-connect.repository';
import DashboardPageComponent from './dashboard-page.component';

describe('DashboardPageComponent', () => {
  let component: DashboardPageComponent;
  let fixture: ComponentFixture<DashboardPageComponent>;
  const router = { navigate: jest.fn(() => Promise.resolve(true)) };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent, TranslateModule.forRoot()],
      providers: [{ provide: Router, useValue: router }],
    })
      .overrideComponent(DashboardPageComponent, { set: { template: '' } })
      .compileComponents();
    fixture = TestBed.createComponent(DashboardPageComponent);
    component = fixture.componentInstance;
    TestBed.inject(MockHealthConnectRepository).reset();
    fixture.detectChanges();
    router.navigate.mockClear();
  });

  it('derives demographic and case-status KPI counts from the repository signals', () => {
    expect(component.demographicCards()).toEqual([
      expect.objectContaining({ id: 'patients', count: 7 }),
      expect.objectContaining({ id: 'female', count: 3 }),
      expect.objectContaining({ id: 'male', count: 4 }),
      expect.objectContaining({ id: 'kids', count: 2 }),
    ]);
    expect(component.caseCards()).toEqual([
      expect.objectContaining({ id: 'urgent', count: 2 }),
      expect.objectContaining({ id: 'open', count: 2 }),
      expect.objectContaining({ id: 'closed', count: 3 }),
    ]);
  });

  it('navigates KPI selections to their query-backed directory and case URLs', () => {
    component.navigateDemographic('female');
    component.navigateDemographic('kids');
    component.navigateCaseStatus('urgent');

    expect(router.navigate).toHaveBeenNthCalledWith(1, ['/patients'], { queryParams: { gender: 'female' } });
    expect(router.navigate).toHaveBeenNthCalledWith(2, ['/patients'], { queryParams: { children: 'true' } });
    expect(router.navigate).toHaveBeenNthCalledWith(3, ['/cases'], { queryParams: { status: 'urgent' } });
  });
});
