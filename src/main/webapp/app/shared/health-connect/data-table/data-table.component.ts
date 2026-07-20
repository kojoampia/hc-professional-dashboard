import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

export type DataTableStatusVariant = 'urgent' | 'open' | 'closed' | 'neutral';

export interface DataTableColumn<T> {
  id: string;
  labelKey: string;
  value: (row: T) => string | number;
  statusVariant?: (row: T) => DataTableStatusVariant;
}

export interface DataTableAction<T> {
  id: string;
  labelKey: string;
  icon?: string;
  isAvailable?: (row: T) => boolean;
}

export interface DataTableActionEvent<T> {
  actionId: string;
  row: T;
}

@Component({
  standalone: true,
  selector: 'hpd-data-table',
  imports: [TranslateModule],
  template: `
    <div class="table-responsive hpd-data-table__scroll" role="region" tabindex="0" [attr.aria-label]="tableLabelKey | translate">
      <table class="table hpd-data-table">
        <caption class="visually-hidden">
          {{
            tableLabelKey | translate
          }}
        </caption>
        <thead [class]="headerVariant === 'neutral' ? '' : 'hpd-data-table__header--' + headerVariant">
          <tr>
            @for (column of columns; track column.id) {
              <th scope="col">{{ column.labelKey | translate }}</th>
            }
            @if (actions.length) {
              <th scope="col">
                <span class="visually-hidden">{{ 'healthConnect.table.actions' | translate }}</span>
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows; track trackBy(row)) {
            <tr [class]="rowVariant(row)">
              @for (column of columns; track column.id) {
                <td [attr.data-label]="column.labelKey | translate">{{ column.value(row) }}</td>
              }
              @if (actions.length) {
                <td class="hpd-data-table__actions">
                  @for (action of actions; track action.id) {
                    @if (action.isAvailable?.(row) ?? true) {
                      <button
                        class="hpd-focusable btn btn-sm btn-outline-primary"
                        type="button"
                        [attr.aria-label]="action.labelKey | translate"
                        (click)="actionTriggered.emit({ actionId: action.id, row })"
                      >
                        @if (action.icon) {
                          <span aria-hidden="true">{{ action.icon }}</span>
                          <span class="visually-hidden">{{ action.labelKey | translate }}</span>
                        } @else {
                          {{ action.labelKey | translate }}
                        }
                      </button>
                    }
                  }
                </td>
              }
            </tr>
          } @empty {
            <tr>
              <td class="text-center" [attr.colspan]="columns.length + (actions.length ? 1 : 0)">
                {{ emptyKey | translate }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .hpd-data-table tr.hpd-data-table--urgent > * { background: var(--hpd-color-row-urgent); }
    .hpd-data-table tr.hpd-data-table--open > * { background: var(--hpd-color-row-open); }
    .hpd-data-table tr.hpd-data-table--closed > * { background: var(--hpd-color-row-closed); }
    .hpd-data-table thead.hpd-data-table__header--urgent th { background: var(--hpd-color-card-urgent); }
    .hpd-data-table thead.hpd-data-table__header--open th { background: var(--hpd-color-card-open); }
    .hpd-data-table thead.hpd-data-table__header--closed th { background: var(--hpd-color-card-closed); }
    .hpd-data-table__actions { display: flex; gap: 0.5rem; }
    .hpd-data-table__scroll:focus-visible { outline: none; box-shadow: var(--hpd-focus-ring); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DataTableComponent<T> {
  @Input({ required: true }) columns: readonly DataTableColumn<T>[] = [];
  @Input({ required: true }) rows: readonly T[] = [];
  @Input() actions: readonly DataTableAction<T>[] = [];
  @Input() emptyKey = 'healthConnect.states.empty';
  @Input() tableLabelKey = 'healthConnect.table.label';
  @Input() statusVariant: ((row: T) => DataTableStatusVariant) | null = null;
  @Input() headerVariant: DataTableStatusVariant = 'neutral';
  @Input() trackBy: (row: T) => string | number = (_row: T): number => 0;
  @Output() readonly actionTriggered = new EventEmitter<DataTableActionEvent<T>>();

  rowVariant(row: T): string {
    const variant = this.statusVariant?.(row) ?? 'neutral';
    return variant === 'neutral' ? '' : `hpd-data-table--${variant}`;
  }
}
