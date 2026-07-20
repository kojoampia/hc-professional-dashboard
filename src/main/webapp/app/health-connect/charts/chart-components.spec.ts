import { NO_ERRORS_SCHEMA, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import GroupedBarChartComponent from './grouped-bar-chart.component';
import LineChartComponent from './line-chart.component';
import PieChartComponent from './pie-chart.component';

describe('HealthConnect chart components', () => {
  const setup = async <T>(component: Type<T>): Promise<ComponentFixture<T>> => {
    await TestBed.configureTestingModule({
      imports: [component, TranslateModule.forRoot()],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(component, { set: { imports: [TranslateModule], schemas: [NO_ERRORS_SCHEMA] } })
      .compileComponents();
    return TestBed.createComponent(component);
  };

  it('provides a labelled chart card and text alternative for the line chart', async () => {
    const fixture = await setup(LineChartComponent);
    fixture.componentRef.setInput('points', [{ x: '2026-07-20T08:00:00Z', y: 1 }]);
    fixture.componentRef.setInput('titleKey', 'healthConnect.dashboard.caseTime');
    fixture.componentRef.setInput('descriptionKey', 'healthConnect.dashboard.charts.caseTimeDescription');
    fixture.componentRef.setInput('legendKey', 'healthConnect.dashboard.charts.caseSeries');
    fixture.componentRef.setInput('xAxisKey', 'healthConnect.dashboard.charts.date');
    fixture.componentRef.setInput('yAxisKey', 'healthConnect.dashboard.charts.caseCount');
    fixture.detectChanges();

    const figure = fixture.nativeElement.querySelector('figure') as HTMLElement;
    const chart = fixture.nativeElement.querySelector('[role="img"]') as HTMLElement;
    expect(figure.getAttribute('aria-labelledby')).toBe('hpd-case-timeline-title');
    expect(figure.getAttribute('aria-describedby')).toBe('hpd-case-timeline-description');
    expect(chart.getAttribute('aria-labelledby')).toBe('hpd-case-timeline-title');
    expect(fixture.nativeElement.querySelector('svg')).toBeNull();
  });

  it('renders labelled pie and grouped-bar chart wrappers without application SVG markup', async () => {
    const pieFixture = await setup(PieChartComponent);
    pieFixture.componentRef.setInput('segments', [{ label: 'urgent', value: 2 }]);
    pieFixture.componentRef.setInput('titleKey', 'healthConnect.dashboard.caseDistribution');
    pieFixture.componentRef.setInput('descriptionKey', 'healthConnect.dashboard.charts.caseDistributionDescription');
    pieFixture.componentRef.setInput('legendKey', 'healthConnect.dashboard.charts.statusLegend');
    pieFixture.detectChanges();

    expect(pieFixture.nativeElement.querySelector('figure').getAttribute('aria-labelledby')).toBe('hpd-case-distribution-title');

    TestBed.resetTestingModule();
    const groupedFixture = await setup(GroupedBarChartComponent);
    groupedFixture.componentRef.setInput('groups', [{ label: 'Ada', bars: [{ label: 'cases', value: 2 }] }]);
    groupedFixture.componentRef.setInput('titleKey', 'healthConnect.dashboard.casePatient');
    groupedFixture.componentRef.setInput('descriptionKey', 'healthConnect.dashboard.charts.casePatientDescription');
    groupedFixture.componentRef.setInput('legendKey', 'healthConnect.dashboard.charts.caseLegend');
    groupedFixture.componentRef.setInput('xAxisKey', 'healthConnect.patient.patient');
    groupedFixture.componentRef.setInput('yAxisKey', 'healthConnect.dashboard.charts.caseCount');
    groupedFixture.detectChanges();

    expect(groupedFixture.nativeElement.querySelector('figure').getAttribute('aria-describedby')).toBe('hpd-cases-by-patient-description');
    expect(groupedFixture.nativeElement.querySelector('svg')).toBeNull();
  });
});
