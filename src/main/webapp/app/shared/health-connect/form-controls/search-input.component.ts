import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, debounce, distinctUntilChanged, takeUntil, timer } from 'rxjs';

@Component({
  standalone: true,
  selector: 'hpd-search-input',
  imports: [FormsModule, TranslateModule],
  template: `
    <label>
      <span class="visually-hidden">{{ labelKey | translate }}</span>
      <input
        class="form-control hpd-focusable"
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
