import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, debounce, distinctUntilChanged, takeUntil, timer } from 'rxjs';

@Component({
  standalone: true,
  selector: 'hpd-search-input',
  imports: [FormsModule, MatIconModule, TranslateModule],
  template: `
    <label class="relative block w-full">
      <span class="sr-only">{{ labelKey | translate }}</span>
      <mat-icon aria-hidden="true" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 !text-lg text-slate-400"
        >search</mat-icon
      >
      <input
        class="hpd-focusable w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm focus:border-hpd-primary"
        type="search"
        [disabled]="disabled"
        [placeholder]="labelKey | translate"
        [value]="value"
        (input)="onInput($any($event.target).value)"
      />
    </label>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SearchInputComponent implements OnDestroy {
  @Input({ required: true }) labelKey!: string;
  @Input() value = '';
  @Input() disabled = false;
  @Input() debounceMs = 300;
  @Output() readonly searchChange = new EventEmitter<string>();

  private readonly values = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor() {
    this.values
      .pipe(
        debounce(() => timer(this.debounceMs)),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe(value => this.searchChange.emit(value));
  }

  onInput(value: string): void {
    this.values.next(value);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
