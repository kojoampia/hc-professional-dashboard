import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'hpd-pagination',
  imports: [TranslateModule],
  template: `
    @if (totalPages > 1) {
      <nav [attr.aria-label]="'healthConnect.pagination.label' | translate">
        <ul class="mt-3 flex items-center justify-center gap-1 text-xs text-slate-500">
          <li>
            <button
              class="hpd-focusable rounded-md px-2 py-1 font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              type="button"
              [disabled]="currentPage() === 1"
              (click)="goTo(currentPage() - 1)"
            >
              {{ 'healthConnect.actions.previous' | translate }}
            </button>
          </li>
          @for (page of pages; track page) {
            <li>
              <button
                class="hpd-focusable h-7 w-7 rounded-md font-medium"
                [class.bg-hpd-primary]="page === currentPage()"
                [class.text-white]="page === currentPage()"
                [class.text-slate-500]="page !== currentPage()"
                [class.hover:bg-slate-100]="page !== currentPage()"
                type="button"
                [attr.aria-current]="page === currentPage() ? 'page' : null"
                [attr.aria-label]="'healthConnect.pagination.page' | translate: { page }"
                (click)="goTo(page)"
              >
                {{ page }}
              </button>
            </li>
          }
          <li>
            <button
              class="hpd-focusable rounded-md px-2 py-1 font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              type="button"
              [disabled]="currentPage() === totalPages"
              (click)="goTo(currentPage() + 1)"
            >
              {{ 'healthConnect.actions.next' | translate }}
            </button>
          </li>
        </ul>
      </nav>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PaginationComponent implements OnChanges {
  @Input() totalPages = 1;
  @Input() initialPage = 1;
  @Output() readonly pageChange = new EventEmitter<number>();

  readonly currentPage = signal(1);

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_value, index) => index + 1);
  }

  ngOnChanges(): void {
    this.currentPage.set(Math.min(Math.max(1, this.initialPage), Math.max(1, this.totalPages)));
  }

  goTo(page: number): void {
    const next = Math.min(Math.max(1, page), this.totalPages);
    if (next !== this.currentPage()) {
      this.currentPage.set(next);
      this.pageChange.emit(next);
    }
  }
}
