import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';

import { AccountService } from 'app/core/auth/account.service';

import { hasHealthConnectPermission } from '../authority-role';
import { DutyRoster } from '../health-connect.models';
import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';

@Component({
  standalone: true,
  selector: 'hpd-duty-roster-page',
  imports: [CommonModule, TranslateModule],
  template: `
    <main class="hpd-container py-4">
      <h1>{{ 'healthConnect.navigation.dutyRoster' | translate }}</h1>

      <section class="hpd-roster-grid">
        <article>
          <h2>{{ 'healthConnect.roster.subscribed' | translate }}</h2>
          @for (roster of subscribedRosters(); track roster.id) {
            <ng-container [ngTemplateOutlet]="rosterCard" [ngTemplateOutletContext]="{ roster: roster }" />
          } @empty {
            <p>{{ 'healthConnect.states.empty' | translate }}</p>
          }
        </article>
        <article>
          <h2>{{ 'healthConnect.roster.available' | translate }}</h2>
          @for (roster of availableRosters(); track roster.id) {
            <ng-container [ngTemplateOutlet]="rosterCard" [ngTemplateOutletContext]="{ roster: roster }" />
          } @empty {
            <p>{{ 'healthConnect.states.empty' | translate }}</p>
          }
        </article>
      </section>

      <ng-template #rosterCard let-roster="roster">
        <section class="hpd-roster-card">
          <h3>{{ roster.name }}</h3>
          @if (canManageRosters() && professionalId(); as professionalId) {
            <button class="hpd-focusable btn btn-outline-primary" type="button" (click)="toggleSubscription(roster, professionalId)">
              {{ (isSubscribed(roster) ? 'healthConnect.actions.unsubscribe' : 'healthConnect.actions.subscribe') | translate }}
            </button>
          } @else {
            <p>{{ 'healthConnect.states.readOnly' | translate }}</p>
          }
          <h4>{{ 'healthConnect.roster.shifts' | translate }}</h4>
          @for (shift of roster.shifts; track shift.id) {
            <p>
              <strong>{{ 'healthConnect.roster.' + shift.status | translate }}</strong>
              · {{ shift.startsAt.slice(0, 16) }} – {{ shift.endsAt.slice(0, 16) }}
            </p>
          } @empty {
            <p>{{ 'healthConnect.states.empty' | translate }}</p>
          }
        </section>
      </ng-template>
    </main>
  `,
  styles: `
    .hpd-roster-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
      gap: 1rem;
    }
    .hpd-roster-card {
      margin-block: 1rem;
      padding: 1rem;
      border: 1px solid var(--hpd-color-border);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DutyRosterPageComponent {
  readonly repository = inject(HEALTH_CONNECT_REPOSITORY);
  private readonly account = inject(AccountService);
  private readonly currentAccount = toSignal(this.account.getAuthenticationState(), { initialValue: null });

  readonly professionalId = computed(() => {
    const login = this.currentAccount()?.login;
    return login ? this.repository.professionalIdForAccount(login) : null;
  });
  readonly canManageRosters = computed(() => hasHealthConnectPermission(this.currentAccount()?.authorities, 'manageDutyRoster'));
  readonly subscribedRosters = computed(() => this.filterRosters(true));
  readonly availableRosters = computed(() => this.filterRosters(false));

  isSubscribed(roster: DutyRoster): boolean {
    const professionalId = this.professionalId();
    return professionalId !== null && roster.subscribedProfessionalIds.includes(professionalId);
  }

  toggleSubscription(roster: DutyRoster, professionalId: string): void {
    if (!this.canManageRosters()) {
      return;
    }
    if (this.isSubscribed(roster)) {
      this.repository.unsubscribeProfessionalFromRoster(professionalId, roster.id);
    } else {
      this.repository.subscribeProfessionalToRoster(professionalId, roster.id);
    }
  }

  private filterRosters(subscribed: boolean): readonly DutyRoster[] {
    const professionalId = this.professionalId();
    if (!professionalId) {
      return [];
    }
    return this.repository.dutyRosters().filter(roster => roster.subscribedProfessionalIds.includes(professionalId) === subscribed);
  }
}
