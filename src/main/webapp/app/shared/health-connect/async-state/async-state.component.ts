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
    <!--
      ⭐ THE NESTED LIVE REGIONS ARE DELIBERATE, AND THIS IS THE ONE PLACE THAT SAYS SO.
      backlog.md item 207, decided 2026-09-25 by the owner. It covers all THREE sites carrying this
      shape: this component, case-detail-page.component.ts and patient-record-page.component.ts.

      The shape is an implicitly-assertive role="alert" (and a polite role="status") directly inside an
      aria-live="polite" aria-atomic="true" wrapper. Confirmed on the deployed artefact rather than
      inferred from this template: the wrapper contains the arm, DOM distance 0.

      WHY BOTH LAYERS EXIST — each is somebody's fix:
        • the WRAPPER is item 204's. A live region must exist BEFORE content is inserted, or the
          insertion is not announced on some pairs. So the wrapper is stable and the arms swap inside.
        • the ARM ROLES are item 146's split: an error is assertive, a refusal is polite. One polite
          wrapper with role-less arms would make a genuine error polite, which is what that split
          exists to prevent.

      ⚠ WHAT IS ACCEPTED: on some screen-reader/browser pairs an arm swap into role="alert" may be
      announced TWICE — once on the alert's insertion, once as the polite wrapper's content change.
      That is accepted as the lesser cost.

      ⛔ ACCEPTED, NOT DISPROVEN, AND THE DIFFERENCE MATTERS. Nobody has run a screen reader against
      this. An attempt on 2026-09-25 reached a working AT-SPI bus with the screen-reader flag set and
      failed for a structural reason: the browser under automation is not a process this workspace can
      attach an assistive technology to. So the choice was between a known-unmeasured risk and an
      unknown-unmeasured one, and changing announcement behaviour blind in three places at once is the
      worse bet. If anyone does run one: measure first, then rewrite this comment.

      ⛔ DO NOT "simplify" by stripping the inner roles or dropping the wrapper's aria-live. Each
      removes a different person's fix, and neither alternative has been tested either.
    -->
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
