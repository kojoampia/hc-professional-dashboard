import { Injectable } from '@angular/core';
import { IChartItem } from './chart-item-model';

@Injectable({
  providedIn: 'root',
})
export class StatusService {
  constructor() {}

  /* ----- Create Mock Data ----- */
  getServiceSeries(): IChartItem[] {
    const data = this.createMockData();
    const chartItems: IChartItem[] = [];
    chartItems.push({
      label: 'Grooming',
      name: 'Grooming',
      series: data.filter(item => item.label === 'Grooming'),
    });

    chartItems.push({
      label: 'Cooking',
      name: 'Cooking',
      series: data.filter(item => item.label === 'Cooking'),
    });

    chartItems.push({
      label: 'Cleaning',
      name: 'Cleaning',
      series: data.filter(item => item.label === 'Cleaning'),
    });

    chartItems.push({
      label: 'Washing',
      name: 'Washing',
      series: data.filter(item => item.label === 'Washing'),
    });

    chartItems.push({
      label: 'Grocery',
      name: 'Grocery',
      series: data.filter(item => item.label === 'Grocery'),
    });

    chartItems.push({
      label: 'Dining',
      name: 'Dining',
      series: data.filter(item => item.label === 'Dining'),
    });

    return chartItems;
  }

  getServicesPerDay(): IChartItem[] {
    const data = this.createMockData();
    const chartItems: IChartItem[] = [];

    chartItems.push({
      name: '2024-01-01',
      label: '2024-01-01',
      series: data.filter(item => item.name === '2024-01-01'),
    });

    chartItems.push({
      name: '2024-01-02',
      label: '2024-01-02',
      series: data.filter(item => item.name === '2024-01-02'),
    });

    chartItems.push({
      name: '2024-01-03',
      label: '2024-01-03',
      series: data.filter(item => item.name === '2024-01-03'),
    });

    chartItems.push({
      name: '2024-01-04',
      label: '2024-01-04',
      series: data.filter(item => item.name === '2024-01-04'),
    });

    chartItems.push({
      name: '2024-01-05',
      label: '2024-01-05',
      series: data.filter(item => item.name === '2024-01-05'),
    });

    chartItems.push({
      name: '2024-01-06',
      label: '2024-01-06',
      series: data.filter(item => item.name === '2024-01-06'),
    });

    chartItems.push({
      name: '2024-01-07',
      label: '2024-01-07',
      series: data.filter(item => item.name === '2024-01-07'),
    });

    return chartItems;
  }

  createMockData(): IChartItem[] {
    const chartItems: IChartItem[] = [];
    chartItems.push({ label: 'Grooming', name: '2024-01-01', value: 2 });
    chartItems.push({ label: 'Cooking', name: '2024-01-01', value: 4 });
    chartItems.push({ label: 'Cleaning', name: '2024-01-01', value: 2 });
    chartItems.push({ label: 'Washing', name: '2024-01-01', value: 1 });
    chartItems.push({ label: 'Grocery', name: '2024-01-01', value: 3 });
    chartItems.push({ label: 'Dining', name: '2024-01-01', value: 5 });

    chartItems.push({ label: 'Grooming', name: '2024-01-02', value: 2 });
    chartItems.push({ label: 'Cooking', name: '2024-01-02', value: 1 });
    chartItems.push({ label: 'Cleaning', name: '2024-01-02', value: 1 });
    chartItems.push({ label: 'Washing', name: '2024-01-02', value: 1 });
    chartItems.push({ label: 'Grocery', name: '2024-01-02', value: 3 });
    chartItems.push({ label: 'Dining', name: '2024-01-02', value: 3 });

    chartItems.push({ label: 'Grooming', name: '2024-01-03', value: 2 });
    chartItems.push({ label: 'Cooking', name: '2024-01-03', value: 2 });
    chartItems.push({ label: 'Cleaning', name: '2024-01-03', value: 2 });
    chartItems.push({ label: 'Washing', name: '2024-01-03', value: 4 });
    chartItems.push({ label: 'Grocery', name: '2024-01-03', value: 2 });
    chartItems.push({ label: 'Dining', name: '2024-01-03', value: 2 });

    chartItems.push({ label: 'Grooming', name: '2024-01-04', value: 2 });
    chartItems.push({ label: 'Cooking', name: '2024-01-04', value: 2 });
    chartItems.push({ label: 'Cleaning', name: '2024-01-04', value: 2 });
    chartItems.push({ label: 'Washing', name: '2024-01-04', value: 1 });
    chartItems.push({ label: 'Grocery', name: '2024-01-04', value: 1 });
    chartItems.push({ label: 'Dining', name: '2024-01-04', value: 3 });

    chartItems.push({ label: 'Grooming', name: '2024-01-05', value: 2 });
    chartItems.push({ label: 'Cooking', name: '2024-01-05', value: 2 });
    chartItems.push({ label: 'Cleaning', name: '2024-01-05', value: 2 });
    chartItems.push({ label: 'Washing', name: '2024-01-05', value: 2 });
    chartItems.push({ label: 'Grocery', name: '2024-01-05', value: 3 });
    chartItems.push({ label: 'Dining', name: '2024-01-05', value: 1 });

    chartItems.push({ label: 'Grooming', name: '2024-01-06', value: 2 });
    chartItems.push({ label: 'Cooking', name: '2024-01-06', value: 2 });
    chartItems.push({ label: 'Cleaning', name: '2024-01-06', value: 2 });
    chartItems.push({ label: 'Washing', name: '2024-01-06', value: 1 });
    chartItems.push({ label: 'Grocery', name: '2024-01-06', value: 1 });
    chartItems.push({ label: 'Dining', name: '2024-01-06', value: 2 });

    chartItems.push({ label: 'Grooming', name: '2024-01-07', value: 3 });
    chartItems.push({ label: 'Cooking', name: '2024-01-07', value: 3 });
    chartItems.push({ label: 'Cleaning', name: '2024-01-07', value: 2 });
    chartItems.push({ label: 'Washing', name: '2024-01-07', value: 4 });
    chartItems.push({ label: 'Grocery', name: '2024-01-07', value: 5 });
    chartItems.push({ label: 'Dining', name: '2024-01-07', value: 3 });

    return chartItems;
  }
}
