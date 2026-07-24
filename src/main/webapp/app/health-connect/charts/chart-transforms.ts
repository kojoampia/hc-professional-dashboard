import { ChartData } from 'chart.js';

import { GroupedBarChartGroup, LineChartPoint, PieChartSegment } from '../health-connect.models';

/** Indigo/slate palette from professional-demo.html — see application-migration.md Phase 0. */
const CHART_PALETTE = ['#6366f1', '#818cf8', '#1b3a57', '#0e7c6b', '#f59e0b'];

/** Case-status colors for the case distribution chart: orange/amber/green for urgent/open/closed. */
const CASE_STATUS_COLORS: Record<string, string> = {
  urgent: '#f97316',
  open: '#f59e0b',
  closed: '#22c55e',
};

export type LineChartJsData = ChartData<'line', number[], string>;
export type DoughnutChartJsData = ChartData<'doughnut', number[], string>;
export type BarChartJsData = ChartData<'bar', number[], string>;

export const toLineChartData = (points: readonly LineChartPoint[], seriesLabel: string): LineChartJsData => ({
  labels: points.map(point => point.x.slice(0, 10)),
  datasets: [
    {
      label: seriesLabel,
      data: points.map(point => point.y),
      borderColor: '#1fbe9c',
      backgroundColor: 'rgba(31, 190, 156, 0.12)',
      tension: 0.4,
      fill: true,
    },
  ],
});

export const toDoughnutChartData = (
  segments: readonly PieChartSegment[],
  labelFor: (segment: PieChartSegment) => string,
): DoughnutChartJsData => ({
  labels: segments.map(labelFor),
  datasets: [
    {
      data: segments.map(segment => segment.value),
      backgroundColor: segments.map((segment, index) => CASE_STATUS_COLORS[segment.label] ?? CHART_PALETTE[index % CHART_PALETTE.length]),
      borderWidth: 0,
    },
  ],
});

export const toGroupedBarChartData = (groups: readonly GroupedBarChartGroup[], labelFor: (label: string) => string): BarChartJsData => {
  const barLabels = groups[0]?.bars.map(bar => bar.label) ?? [];
  return {
    labels: groups.map(group => group.label),
    datasets: barLabels.map((barLabel, index) => ({
      label: labelFor(barLabel),
      data: groups.map(group => group.bars.find(bar => bar.label === barLabel)?.value ?? 0),
      backgroundColor: CHART_PALETTE[index % CHART_PALETTE.length],
      borderRadius: 4,
    })),
  };
};
