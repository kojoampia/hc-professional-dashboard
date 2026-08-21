import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';

import { AccountService } from 'app/core/auth/account.service';
import { Authority } from 'app/config/authority.constants';

import { AbsencePanelComponent } from '../roster/absence-panel.component';
import { AbsenceQueueComponent } from '../roster/absence-queue.component';
import { RosterCalendarComponent } from '../roster/roster-calendar.component';
import { RoundBuilderComponent } from '../roster/round-builder.component';

/**
 * Duty roster (WP6's assignment-only decision, and the one exception DR8 gives it).
 *
 * <p>The page is now a composition rather than a screen: the calendar (DR5–DR7), a professional's own
 * time off (DR8), and — behind `ROLE_ADMIN` — the round builder and the absence approval queue.
 *
 * <p><b>The assignment-only policy still holds, with exactly one exception.</b> A professional may
 * *ask* for time off and withdraw a request that has not been granted; everything else on this page
 * that writes is admin-only, and there is still no self-subscription anywhere. See
 * `professional-onboarding-workflow.md` § Duty roster.
 *
 * <p>Ordering is deliberate. The calendar first, because reading the roster is what almost every
 * visit here is for; then a clinician's own leave, which is the only thing they can act on; then the
 * administrator's surfaces, which are a different job done by a small number of people.
 */
@Component({
  standalone: true,
  selector: 'hpd-duty-roster-page',
  imports: [TranslateModule, RosterCalendarComponent, AbsencePanelComponent, AbsenceQueueComponent, RoundBuilderComponent],
  template: `
    <main class="grid w-full gap-4 px-4 py-8 md:px-8">
      <h1 class="sr-only">{{ 'healthConnect.navigation.dutyRoster' | translate }}</h1>

      <div>
        <hpd-roster-calendar />
        @if (!isAdmin()) {
          <p class="m-0 mt-2 text-xs text-hpd-muted">{{ 'healthConnect.roster.assignmentOnly' | translate }}</p>
        }
      </div>

      <hpd-absence-panel />

      @if (isAdmin()) {
        <hpd-absence-queue />
        <hpd-round-builder />
      }
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DutyRosterPageComponent {
  private readonly account = inject(AccountService);
  private readonly currentAccount = toSignal(this.account.getAuthenticationState(), { initialValue: null });

  readonly isAdmin = computed(() => (this.currentAccount()?.authorities ?? []).includes(Authority.ADMIN));
}
