import { toDoughnutChartData, toGroupedBarChartData, toLineChartData } from './chart-transforms';

describe('HealthConnect chart transforms', () => {
  it('converts date points to a Chart.js line dataset without generating a canvas', () => {
    expect(
      toLineChartData(
        [
          { x: '2026-07-20T08:00:00Z', y: 1 },
          { x: '2026-07-21T08:00:00Z', y: 3 },
        ],
        'Cases',
      ),
    ).toEqual({
      labels: ['2026-07-20', '2026-07-21'],
      datasets: [
        {
          label: 'Cases',
          data: [1, 3],
          borderColor: '#1fbe9c',
          backgroundColor: 'rgba(31, 190, 156, 0.12)',
          tension: 0.4,
          fill: true,
        },
      ],
    });
  });

  it('maps pie segments and grouped bars to Chart.js data', () => {
    expect(
      toDoughnutChartData(
        [
          { label: 'urgent', value: 2 },
          { label: 'open', value: 3 },
          { label: 'closed', value: 5 },
        ],
        segment => `Status: ${segment.label}`,
      ),
    ).toEqual({
      labels: ['Status: urgent', 'Status: open', 'Status: closed'],
      datasets: [{ data: [2, 3, 5], backgroundColor: ['#f97316', '#f59e0b', '#22c55e'], borderWidth: 0 }],
    });

    expect(toDoughnutChartData([{ label: 'unknown', value: 1 }], segment => segment.label)).toEqual({
      labels: ['unknown'],
      datasets: [{ data: [1], backgroundColor: ['#6366f1'], borderWidth: 0 }],
    });

    expect(
      toGroupedBarChartData(
        [
          {
            label: 'Ada',
            bars: [
              { label: 'new', value: 4 },
              { label: 'returning', value: 2 },
            ],
          },
          {
            label: 'Bea',
            bars: [
              { label: 'new', value: 1 },
              { label: 'returning', value: 5 },
            ],
          },
        ],
        label => label.toUpperCase(),
      ),
    ).toEqual({
      labels: ['Ada', 'Bea'],
      datasets: [
        { label: 'NEW', data: [4, 1], backgroundColor: '#6366f1', borderRadius: 4 },
        { label: 'RETURNING', data: [2, 5], backgroundColor: '#818cf8', borderRadius: 4 },
      ],
    });
  });
});
