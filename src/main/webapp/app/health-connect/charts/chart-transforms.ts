import { GroupedBarChartGroup, LineChartPoint, PieChartSegment } from '../health-connect.models';

export interface NgxChartSeries {
  name: string;
  value: number;
}

export interface NgxLineChartSeries {
  name: string;
  series: NgxChartSeries[];
}

export interface NgxGroupedBarSeries {
  name: string;
  series: NgxChartSeries[];
}

export const toLineChartSeries = (points: readonly LineChartPoint[], seriesName: string): NgxLineChartSeries[] => [
  {
    name: seriesName,
    series: points.map(point => ({ name: point.x.slice(0, 10), value: point.y })),
  },
];

export const toPieChartResults = (segments: readonly PieChartSegment[], labelFor: (segment: PieChartSegment) => string): NgxChartSeries[] =>
  segments.map(segment => ({ name: labelFor(segment), value: segment.value }));

export const toGroupedBarChartResults = (
  groups: readonly GroupedBarChartGroup[],
  labelFor: (label: string) => string,
): NgxGroupedBarSeries[] =>
  groups.map(group => ({
    name: group.label,
    series: group.bars.map(bar => ({ name: labelFor(bar.label), value: bar.value })),
  }));
