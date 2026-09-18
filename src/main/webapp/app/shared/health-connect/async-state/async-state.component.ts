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
      } @else if (status === 'forbidden') {
        <!--
          A refusal, said plainly and WITH NO RETRY BUTTON (backlog item 146). The 403 a technician
          gets from patientservice is a decision about who they are, not an outage: retrying it
          re-issues the same refusal for ever, and a button offering to try again says the opposite
          of what is true. role="status", not role="alert" — nothing went wrong.

          The same reasoning and the same word as roster/day-list.component.ts, which discriminates
          the identical key one feature over.
        -->
        <section role="status" data-cy="asyncForbidden" class="flex flex-col items-center gap-3 py-12 text-center text-hpd-muted">
          <mat-icon aria-hidden="true" class="!h-9 !w-9 !text-4xl text-hpd-warning">block</mat-icon>
          <p>{{ forbiddenKey | translate }}</p>
        </section>
      } @else if (status === 'ready' && empty) {
        <div class="flex flex-col items-center gap-2 py-12 text-center text-hpd-subtle">
          <mat-icon aria-hidden="true" class="!h-9 !w-9 !text-4xl opacity-50">inbox</mat-icon>
          <p>{{ emptyKey | translate }}</p>
        </div>
      } @else if (status === 'ready' || status === 'idle') {
        <ng-content />
      } @else {
        <!--
          FAIL CLOSED, and this branch is the reason the one above names its two states instead of
          being a bare @else.

          Until item 146 the content was projected by a bare @else, so ANY status the branches above
          did not name rendered the wrapped table exactly as though the read had succeeded — and the
          one thing a status nobody handled cannot be evidence of is health. Adding the forbidden
          member to AsyncStatus made that concrete: under the old shape it would have rendered a
          technician's refused case queue as if it had arrived.

          So an unrecognised status renders a failure, and async-state.component.spec.ts enumerates
          ASYNC_STATUSES to prove no member reaches here by accident. No Retry: nobody knows what
          retrying an unknown state would mean.
        -->
        <section role="alert" data-cy="asyncUnknownStatus" class="flex flex-col items-center gap-3 py-12 text-center text-hpd-muted">
          <mat-icon aria-hidden="true" class="!h-9 !w-9 !text-4xl text-hpd-danger">error_outline</mat-icon>
          <p>{{ errorKey | translate }}</p>
        </section>
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
  /**
   * What a refused read says. Overridable per surface for {@link errorKey}'s reason — a case queue
   * and a patient directory are refused different things — but the default is deliberately generic,
   * because a wrapper that forces every caller to supply wording gets given the error key.
   */
  @Input() forbiddenKey = 'healthConnect.states.forbidden';
  @Output() readonly retry = new EventEmitter<void>();
}
