import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { AsyncStatus } from 'app/health-connect/health-connect.models';

import LoadingSkeletonComponent from './loading-skeleton.component';

@Component({
  standalone: true,
  selector: 'hpd-async-state',
  imports: [LoadingSkeletonComponent, MatIconModule, TranslateModule],
  template: `
    <div aria-live="polite" aria-atomic="true">
      @if (status === 'loading') {
        <hpd-loading-skeleton [labelKey]="loadingKey" />
      } @else if (status === 'error') {
        <section role="alert" class="flex flex-col items-center gap-3 py-12 text-center text-hpd-muted">
          <mat-icon aria-hidden="true" class="!h-9 !w-9 !text-4xl text-hpd-danger">error_outline</mat-icon>
          <p>{{ errorKey | translate }}</p>
          <button
            class="hpd-focusable rounded-full bg-hpd-cream px-4 py-2 text-sm font-medium text-hpd-primary-dark transition-colors hover:bg-hpd-cream"
            type="button"
            (click)="retry.emit()"
          >
            {{ 'healthConnect.actions.retry' | translate }}
          </button>
        </section>
      } @else if (status === 'ready' && empty) {
        <div class="flex flex-col items-center gap-2 py-12 text-center text-hpd-subtle">
          <mat-icon aria-hidden="true" class="!h-9 !w-9 !text-4xl opacity-50">inbox</mat-icon>
          <p>{{ emptyKey | translate }}</p>
        </div>
      } @else {
        <ng-content />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AsyncStateComponent {
  @Input({ required: true }) status!: AsyncStatus;
  @Input() empty = false;
  @Input() loadingKey = 'healthConnect.states.loading';
  @Input() emptyKey = 'healthConnect.states.empty';
  @Input() errorKey = 'healthConnect.states.error';
  @Output() readonly retry = new EventEmitter<void>();
}
