import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import StatCardComponent, { StatCardVariant } from './stat-card.component';

export interface StatCard {
  id: string;
  labelKey: string;
  count: number;
  variant?: StatCardVariant;
  link?: string | readonly string[];
}

@Component({
  standalone: true,
  selector: 'hpd-stat-card-row',
  imports: [StatCardComponent],
  template: `
    <div class="hpd-stat-grid" role="list">
      @for (card of cards; track card.id) {
        <div role="listitem">
          <hpd-stat-card
            [labelKey]="card.labelKey"
            [count]="card.count"
            [variant]="card.variant ?? 'neutral'"
            [selected]="selectedId === card.id"
            [link]="card.link ?? null"
            (activate)="select(card.id)"
          />
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StatCardRowComponent {
  @Input({ required: true }) cards: readonly StatCard[] = [];
  @Input() selectedId: string | null = null;
  @Output() readonly selected = new EventEmitter<string>();

  select(id: string): void {
    this.selected.emit(id);
  }
}
