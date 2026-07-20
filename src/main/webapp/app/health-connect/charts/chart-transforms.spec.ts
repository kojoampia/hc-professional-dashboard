import { toGroupedBarChartResults, toLineChartSeries, toPieChartResults } from './chart-transforms';

describe('HealthConnect chart transforms', () => {
  it('converts date points to an ngx-charts line series without generating SVG', () => {
    expect(
      toLineChartSeries(
        [
          { x: '2026-07-20T08:00:00Z', y: 1 },
          { x: '2026-07-21T08:00:00Z', y: 3 },
        ],
        'Cases',
      ),
    ).toEqual([
      {
        name: 'Cases',
        series: [
          { name: '2026-07-20', value: 1 },
          { name: '2026-07-21', value: 3 },
        ],
      },
    ]);
  });

  it('maps pie segments and grouped bars to chart-library data', () => {
    expect(toPieChartResults([{ label: 'urgent', value: 2 }], segment => `Status: ${segment.label}`)).toEqual([
      { name: 'Status: urgent', value: 2 },
    ]);
    expect(toGroupedBarChartResults([{ label: 'Ada', bars: [{ label: 'cases', value: 4 }] }], label => label.toUpperCase())).toEqual([
      { name: 'Ada', series: [{ name: 'CASES', value: 4 }] },
    ]);
  });
});
