import { AfterContentInit, ContentChild, Directive, Host, HostListener, Input, OnDestroy } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import SortDirective from './sort.directive';

export type SortByIconName = 'arrow_upward' | 'arrow_downward' | 'unfold_more';

@Directive({
  standalone: true,
  selector: '[jhiSortBy]',
  exportAs: 'jhiSortBy',
})
export default class SortByDirective<T> implements AfterContentInit, OnDestroy {
  @Input() jhiSortBy!: T;

  @ContentChild(MatIcon, { static: false })
  iconComponent?: MatIcon;

  icon: SortByIconName = 'unfold_more';

  private readonly destroy$ = new Subject<void>();

  constructor(@Host() private sort: SortDirective<T>) {
    sort.predicateChange.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateIcon());
    sort.ascendingChange.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateIcon());
  }

  @HostListener('click')
  onClick(): void {
    if (this.iconComponent) {
      this.sort.sort(this.jhiSortBy);
    }
  }

  ngAfterContentInit(): void {
    this.updateIcon();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateIcon(): void {
    if (this.sort.predicate !== this.jhiSortBy) {
      this.icon = 'unfold_more';
    } else {
      this.icon = this.sort.ascending ? 'arrow_upward' : 'arrow_downward';
    }
  }
}
