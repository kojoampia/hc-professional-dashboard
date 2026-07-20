import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { AsyncStatus } from 'app/health-connect/health-connect.models';

import LoadingSkeletonComponent from './loading-skeleton.component';

@Component({
  standalone: true,
  selector: 'hpd-async-state',
  imports: [LoadingSkeletonComponent, TranslateModule],
  template: `
    <div aria-live="polite" aria-atomic="true">
      @if (status === 'loading') {
        <hpd-loading-skeleton [labelKey]="loadingKey" />
      } @else if (status === 'error') {
        <section role="alert">
          <p>{{ errorKey | translate }}</p>
          <button class="hpd-focusable btn btn-outline-primary" type="button" (click)="retry.emit()">
            {{ 'healthConnect.actions.retry' | translate }}
          </button>
        </section>
      } @else if (status === 'ready' && empty) {
        <p>{{ emptyKey | translate }}</p>
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
