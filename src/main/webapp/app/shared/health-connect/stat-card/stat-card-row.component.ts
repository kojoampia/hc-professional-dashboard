import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import StatCardComponent, { StatCardVariant } from './stat-card.component';

export interface StatCard {
  id: string;
  labelKey: string;
  count: number;
  variant?: StatCardVariant;
  link?: string | string[];
}

@Component({
  standalone: true,
  selector: 'hpd-stat-card-row',
  imports: [StatCardComponent],
  template: `
    <div class="grid grid-cols-2 gap-3 sm:gap-4" [class.md:grid-cols-4]="columns === 4" [class.md:grid-cols-3]="columns === 3" role="list">
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
  /** Desktop column count — the demo uses 4 for demographics, 3 for case status. */
  @Input() columns: 3 | 4 = 4;
  @Input() selectedId: string | null = null;
  @Output() readonly selected = new EventEmitter<string>();

  select(id: string): void {
    this.selected.emit(id);
  }
}
