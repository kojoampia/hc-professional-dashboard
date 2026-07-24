import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
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

// professional-demo.html's renderDataTable only tints the header row by status (rows
// stay plain white/hover-slate) — matched here. `hpd-data-table__header--<variant>` /
// `hpd-data-table--<variant>` are kept as plain marker classes (no visual effect of
// their own) purely so existing specs that assert on them as a status-applied hook
// keep working; the actual tint comes from the Tailwind classes below.
const HEADER_TINT_CLASSES: Record<DataTableStatusVariant, string> = {
  neutral: 'bg-slate-50',
  urgent: 'bg-hpd-row-urgent',
  open: 'bg-hpd-row-open',
  closed: 'bg-hpd-row-closed',
};

@Component({
  standalone: true,
  selector: 'hpd-data-table',
  imports: [MatIconModule, TranslateModule],
  template: `
    <div
      class="hpd-data-table__scroll overflow-x-auto rounded-lg border border-slate-200"
      role="region"
      tabindex="0"
      [attr.aria-label]="tableLabelKey | translate"
    >
      <table class="hpd-data-table w-full text-left text-sm text-slate-600">
        <caption class="sr-only">
          {{
            tableLabelKey | translate
          }}
        </caption>
        <thead class="text-xs uppercase" [class]="headerClasses">
          <tr>
            @for (column of columns; track column.id) {
              <th scope="col" class="px-6 py-4 font-bold text-slate-700">{{ column.labelKey | translate }}</th>
            }
            @if (actions.length) {
              <th scope="col" class="px-6 py-4 text-right font-bold text-slate-700">
                <span class="sr-only">{{ 'healthConnect.table.actions' | translate }}</span>
              </th>
            }
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 bg-white">
          @for (row of rows; track trackBy(row)) {
            <tr class="transition-colors hover:bg-slate-50" [class]="rowVariant(row)">
              @for (column of columns; track column.id) {
                <td class="px-6 py-4" [attr.data-label]="column.labelKey | translate">{{ column.value(row) }}</td>
              }
              @if (actions.length) {
                <td class="hpd-data-table__actions flex items-center justify-end gap-1 px-6 py-4">
                  @for (action of actions; track action.id) {
                    @if (action.isAvailable?.(row) ?? true) {
                      <button
                        class="hpd-focusable inline-flex items-center justify-center rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-hpd-primary"
                        type="button"
                        [attr.aria-label]="action.labelKey | translate"
                        (click)="actionTriggered.emit({ actionId: action.id, row })"
                      >
                        @if (action.icon) {
                          <mat-icon aria-hidden="true" class="!h-5 !w-5 !text-[20px]">{{ action.icon }}</mat-icon>
                          <span class="sr-only">{{ action.labelKey | translate }}</span>
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
              <td class="px-6 py-12 text-center text-slate-400" [attr.colspan]="columns.length + (actions.length ? 1 : 0)">
                <mat-icon class="mb-2 !h-9 !w-9 !text-4xl opacity-50" aria-hidden="true">inbox</mat-icon>
                <p>{{ emptyKey | translate }}</p>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .hpd-data-table__scroll:focus-visible {
      outline: none;
      box-shadow: var(--hpd-focus-ring);
    }
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

  get headerClasses(): string {
    const marker = this.headerVariant === 'neutral' ? '' : `hpd-data-table__header--${this.headerVariant} `;
    return `${marker}${HEADER_TINT_CLASSES[this.headerVariant]}`;
  }
}
