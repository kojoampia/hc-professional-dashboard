import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'hpd-pagination',
  imports: [TranslateModule],
  template: `
    @if (totalPages > 1) {
      <nav [attr.aria-label]="'healthConnect.pagination.label' | translate">
        <ul class="pagination">
          <li class="page-item" [class.disabled]="currentPage() === 1">
            <button class="page-link hpd-focusable" type="button" [disabled]="currentPage() === 1" (click)="goTo(currentPage() - 1)">
              {{ 'healthConnect.actions.previous' | translate }}
            </button>
          </li>
          @for (page of pages; track page) {
            <li class="page-item" [class.active]="page === currentPage()">
              <button
                class="page-link hpd-focusable"
                type="button"
                [attr.aria-current]="page === currentPage() ? 'page' : null"
                [attr.aria-label]="'healthConnect.pagination.page' | translate: { page }"
                (click)="goTo(page)"
              >
                {{ page }}
              </button>
            </li>
          }
          <li class="page-item" [class.disabled]="currentPage() === totalPages">
            <button
              class="page-link hpd-focusable"
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
