import { ChartData } from 'chart.js';

import { GroupedBarChartGroup, LineChartPoint, PieChartSegment } from '../health-connect.models';

/** BridgeCare series palette (navy/gold/steel-blue + status accents) — see global.scss chart tokens. */
const CHART_PALETTE = ['#0d3058', '#c59437', '#8ba9c4', '#2e7d5b', '#b4741a'];

/**
 * Case-status colors for the case distribution chart — matches
 * shared/health-connect/stat-card/stat-card.component.ts's BADGE_CLASSES/
 * BAR_CLASSES for the same variants (--hpd-color-danger/warning-accent/
 * success-accent) so the doughnut chart's slice colors agree with the stat
 * cards above it.
 */
const CASE_STATUS_COLORS: Record<string, string> = {
  urgent: '#b3402f',
  open: '#b4741a',
  closed: '#2e7d5b',
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
      borderColor: '#0d3058',
      backgroundColor: 'rgba(13, 48, 88, 0.10)',
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
