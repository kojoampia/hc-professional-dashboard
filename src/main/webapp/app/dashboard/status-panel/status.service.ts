import { Injectable } from '@angular/core';
import { IChartItem } from './chart-item-model';

@Injectable({
  providedIn: 'root',
})
export class StatusService {
  constructor() {}

  /* ----- Chart Data ----- */
  renameSeriesData(seriesData: any[]): any[] {
    return seriesData.map(item => {
      const name = item.name;
      return {
        name: item.label,
        value: item.value,
        label: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize the first letter of the label
      };
    });
  }

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

  getServicesItems(): IChartItem[] {
    const data = this.createMockData();
    const chartItems: IChartItem[] = [];

    chartItems.push({
      name: 'Kojo',
      label: 'Kojo',
      series: this.renameSeriesData(data.filter(item => item.name === 'Kojo')),
    });

    chartItems.push({
      name: 'Abena',
      label: 'Abena',
      series: this.renameSeriesData(data.filter(item => item.name === 'Abena')),
    });

    chartItems.push({
      name: 'Kuuku',
      label: 'Kuuku',
      series: this.renameSeriesData(data.filter(item => item.name === 'Kuuku')),
    });

    chartItems.push({
      name: 'Yaaba',
      label: 'Yaaba',
      series: this.renameSeriesData(data.filter(item => item.name === 'Yaaba')),
    });

    chartItems.push({
      name: 'Obaayaa',
      label: 'Obaayaa',
      series: this.renameSeriesData(data.filter(item => item.name === 'Obaayaa')),
    });

    chartItems.push({
      name: 'Owuraku',
      label: 'Owuraku',
      series: this.renameSeriesData(data.filter(item => item.name === 'Owuraku')),
    });

    chartItems.push({
      name: 'Nana',
      label: 'Nana',
      series: this.renameSeriesData(data.filter(item => item.name === 'Nana')),
    });

    return chartItems;
  }

  createMockData(): IChartItem[] {
    const chartItems: IChartItem[] = [];
    chartItems.push({ label: 'Grooming', name: 'Kojo', value: 2 });
    chartItems.push({ label: 'Cooking', name: 'Kojo', value: 4 });
    chartItems.push({ label: 'Cleaning', name: 'Kojo', value: 2 });
    chartItems.push({ label: 'Washing', name: 'Kojo', value: 1 });
    chartItems.push({ label: 'Grocery', name: 'Kojo', value: 3 });
    chartItems.push({ label: 'Dining', name: 'Kojo', value: 5 });

    chartItems.push({ label: 'Grooming', name: 'Abena', value: 2 });
    chartItems.push({ label: 'Cooking', name: 'Abena', value: 1 });
    chartItems.push({ label: 'Cleaning', name: 'Abena', value: 1 });
    chartItems.push({ label: 'Washing', name: 'Abena', value: 1 });
    chartItems.push({ label: 'Grocery', name: 'Abena', value: 3 });
    chartItems.push({ label: 'Dining', name: 'Abena', value: 3 });

    chartItems.push({ label: 'Grooming', name: 'Kuuku', value: 5 });
    chartItems.push({ label: 'Cooking', name: 'Kuuku', value: 2 });
    chartItems.push({ label: 'Cleaning', name: 'Kuuku', value: 2 });
    chartItems.push({ label: 'Washing', name: 'Kuuku', value: 4 });
    chartItems.push({ label: 'Grocery', name: 'Kuuku', value: 2 });
    chartItems.push({ label: 'Dining', name: 'Kuuku', value: 2 });

    chartItems.push({ label: 'Grooming', name: 'Yaaba', value: 2 });
    chartItems.push({ label: 'Cooking', name: 'Yaaba', value: 1 });
    chartItems.push({ label: 'Cleaning', name: 'Yaaba', value: 2 });
    chartItems.push({ label: 'Washing', name: 'Yaaba', value: 1 });
    chartItems.push({ label: 'Grocery', name: 'Yaaba', value: 1 });
    chartItems.push({ label: 'Dining', name: 'Yaaba', value: 3 });

    chartItems.push({ label: 'Grooming', name: 'Obaayaa', value: 1 });
    chartItems.push({ label: 'Cooking', name: 'Obaayaa', value: 4 });
    chartItems.push({ label: 'Cleaning', name: 'Obaayaa', value: 1 });
    chartItems.push({ label: 'Washing', name: 'Obaayaa', value: 2 });
    chartItems.push({ label: 'Grocery', name: 'Obaayaa', value: 3 });
    chartItems.push({ label: 'Dining', name: 'Obaayaa', value: 1 });

    chartItems.push({ label: 'Grooming', name: 'Owuraku', value: 4 });
    chartItems.push({ label: 'Cooking', name: 'Owuraku', value: 2 });
    chartItems.push({ label: 'Cleaning', name: 'Owuraku', value: 3 });
    chartItems.push({ label: 'Washing', name: 'Owuraku', value: 1 });
    chartItems.push({ label: 'Grocery', name: 'Owuraku', value: 1 });
    chartItems.push({ label: 'Dining', name: 'Owuraku', value: 4 });

    chartItems.push({ label: 'Grooming', name: 'Nana', value: 3 });
    chartItems.push({ label: 'Cooking', name: 'Nana', value: 3 });
    chartItems.push({ label: 'Cleaning', name: 'Nana', value: 2 });
    chartItems.push({ label: 'Washing', name: 'Nana', value: 4 });
    chartItems.push({ label: 'Grocery', name: 'Nana', value: 5 });
    chartItems.push({ label: 'Dining', name: 'Nana', value: 3 });

    return chartItems;
  }

  createCasesMock(): any[] {
    const data: any[] = [];
    data.push({ name: 'Kojo', label: 'Grooming', value: 2 });
    data.push({ name: 'Kojo', label: 'Cooking', value: 4 });
    data.push({ name: 'Kojo', label: 'Cleaning', value: 2 });
    data.push({ name: 'Kojo', label: 'Washing', value: 1 });
    data.push({ name: 'Kojo', label: 'Grocery', value: 3 });
    data.push({ name: 'Kojo', label: 'Dining', value: 5 });
    data.push({ name: 'Abena', label: 'Grooming', value: 2 });
    data.push({ name: 'Abena', label: 'Cooking', value: 1 });
    data.push({ name: 'Abena', label: 'Cleaning', value: 1 });
    data.push({ name: 'Abena', label: 'Washing', value: 1 });
    data.push({ name: 'Abena', label: 'Grocery', value: 3 });
    data.push({ name: 'Abena', label: 'Dining', value: 3 });
    data.push({ name: 'Kuuku', label: 'Grooming', value: 5 });
    data.push({ name: 'Kuuku', label: 'Cooking', value: 2 });
    data.push({ name: 'Kuuku', label: 'Cleaning', value: 2 });
    data.push({ name: 'Kuuku', label: 'Washing', value: 4 });
    data.push({ name: 'Kuuku', label: 'Grocery', value: 2 });
    data.push({ name: 'Kuuku', label: 'Dining', value: 2 });
    data.push({ name: 'Yaaba', label: 'Grooming', value: 2 });
    data.push({ name: 'Yaaba', label: 'Cooking', value: 1 });
    data.push({ name: 'Yaaba', label: 'Cleaning', value: 2 });
    data.push({ name: 'Yaaba', label: 'Washing', value: 1 });
    data.push({ name: 'Yaaba', label: 'Grocery', value: 1 });
    data.push({ name: 'Yaaba', label: 'Dining', value: 3 });
    data.push({ name: 'Obaayaa', label: 'Grooming', value: 1 });
    data.push({ name: 'Obaayaa', label: 'Cooking', value: 4 });
    data.push({ name: 'Obaayaa', label: 'Cleaning', value: 1 });
    data.push({ name: 'Obaayaa', label: 'Washing', value: 2 });
    data.push({ name: 'Obaayaa', label: 'Grocery', value: 3 });
    data.push({ name: 'Obaayaa', label: 'Dining', value: 1 });
    data.push({ name: 'Owuraku', label: 'Grooming', value: 4 });
    data.push({ name: 'Owuraku', label: 'Cooking', value: 2 });
    data.push({ name: 'Owuraku', label: 'Cleaning', value: 3 });
    data.push({ name: 'Owuraku', label: 'Washing', value: 1 });
    data.push({ name: 'Owuraku', label: 'Grocery', value: 1 });
    data.push({ name: 'Owuraku', label: 'Dining', value: 4 });
    data.push({ name: 'Nana', label: 'Grooming', value: 3 });
    data.push({ name: 'Nana', label: 'Cooking', value: 3 });
    data.push({ name: 'Nana', label: 'Cleaning', value: 2 });
    data.push({ name: 'Nana', label: 'Washing', value: 4 });
    data.push({ name: 'Nana', label: 'Grocery', value: 5 });
    data.push({ name: 'Nana', label: 'Dining', value: 3 });
    return data;
  }
}
