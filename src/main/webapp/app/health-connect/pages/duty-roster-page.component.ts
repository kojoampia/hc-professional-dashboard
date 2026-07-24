import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';

import { AccountService } from 'app/core/auth/account.service';

import { hasHealthConnectPermission } from '../authority-role';
import { DutyRoster } from '../health-connect.models';
import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';

@Component({
  standalone: true,
  selector: 'hpd-duty-roster-page',
  imports: [CommonModule, MatIconModule, TranslateModule],
  template: `
    <main class="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 class="mb-1 text-lg font-bold text-slate-900">{{ 'healthConnect.navigation.dutyRoster' | translate }}</h1>
        <p class="mb-6 text-sm text-slate-500">{{ 'healthConnect.roster.subtitle' | translate }}</p>

        <div class="hpd-roster-grid grid grid-cols-1 gap-8 md:grid-cols-2">
          <article>
            <h2 class="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              {{ 'healthConnect.roster.subscribed' | translate }}
            </h2>
            <div class="grid grid-cols-1 gap-4">
              @for (roster of subscribedRosters(); track roster.id) {
                <ng-container [ngTemplateOutlet]="rosterCard" [ngTemplateOutletContext]="{ roster: roster }" />
              } @empty {
                <p class="text-sm text-slate-400">{{ 'healthConnect.states.empty' | translate }}</p>
              }
            </div>
          </article>
          <article>
            <h2 class="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              {{ 'healthConnect.roster.available' | translate }}
            </h2>
            <div class="grid grid-cols-1 gap-4">
              @for (roster of availableRosters(); track roster.id) {
                <ng-container [ngTemplateOutlet]="rosterCard" [ngTemplateOutletContext]="{ roster: roster }" />
              } @empty {
                <p class="text-sm text-slate-400">{{ 'healthConnect.states.empty' | translate }}</p>
              }
            </div>
          </article>
        </div>
      </div>

      <ng-template #rosterCard let-roster="roster">
        <section
          class="hpd-roster-card rounded-xl border p-4"
          [class]="isSubscribed(roster) ? 'border-hpd-primary/40 bg-hpd-primary/5' : 'border-slate-100'"
        >
          <div class="mb-3 flex items-start justify-between gap-2">
            <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800">
              <mat-icon aria-hidden="true" class="!text-lg text-slate-400">event_available</mat-icon>
              {{ roster.name }}
            </h3>
            @if (canManageRosters() && professionalId(); as professionalId) {
              <button
                class="hpd-focusable whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold"
                [class]="
                  isSubscribed(roster) ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-hpd-primary text-white hover:brightness-110'
                "
                type="button"
                (click)="toggleSubscription(roster, professionalId)"
              >
                {{ (isSubscribed(roster) ? 'healthConnect.actions.unsubscribe' : 'healthConnect.actions.subscribe') | translate }}
              </button>
            } @else {
              <p class="text-xs text-slate-400">{{ 'healthConnect.states.readOnly' | translate }}</p>
            }
          </div>
          <h4 class="sr-only">{{ 'healthConnect.roster.shifts' | translate }}</h4>
          <ul class="grid gap-2">
            @for (shift of roster.shifts; track shift.id) {
              <li class="flex items-center justify-between gap-2 text-xs">
                <span class="text-slate-600">{{ shift.startsAt.slice(0, 16) }} → {{ shift.endsAt.slice(11, 16) }}</span>
                <span
                  class="rounded-full px-2 py-0.5 font-bold capitalize"
                  [class]="
                    shift.status === 'active'
                      ? 'bg-emerald-50 text-emerald-600'
                      : shift.status === 'upcoming'
                        ? 'bg-indigo-50 text-hpd-primary'
                        : 'bg-slate-100 text-slate-500'
                  "
                >
                  {{ 'healthConnect.roster.' + shift.status | translate }}
                </span>
              </li>
            } @empty {
              <li class="text-xs text-slate-400">{{ 'healthConnect.states.empty' | translate }}</li>
            }
          </ul>
        </section>
      </ng-template>
    </main>
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
