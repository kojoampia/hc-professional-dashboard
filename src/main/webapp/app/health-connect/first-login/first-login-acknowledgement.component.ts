import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { AccountService } from 'app/core/auth/account.service';
import { AlertService } from 'app/core/util/alert.service';

import { OnboardingApiService } from '../api/onboarding-api.service';

/**
 * First-login interstitial (WP6): once an application reaches ACTIVE, the
 * professional must acknowledge their duties and data-protection obligations
 * exactly once. The acknowledgement is recorded server-side as an append-only
 * OnboardingEvent; accounts without an application never see this.
 */
@Component({
  standalone: true,
  selector: 'hpd-first-login-acknowledgement',
  imports: [TranslateModule],
  template: `
    @if (visible()) {
      <div class="fixed inset-0 z-50 grid place-items-center bg-hpd-primary-dark/60 p-4" data-cy="firstLoginInterstitial">
        <div
          class="w-full max-w-lg rounded-hpd border border-hpd-border bg-white p-6 shadow-hpd-lg"
          role="dialog"
          aria-modal="true"
          aria-labelledby="first-login-title"
        >
          <h2 id="first-login-title" class="mb-2 text-lg font-extrabold tracking-tight text-hpd-primary-dark">
            {{ 'healthConnect.firstLogin.title' | translate }}
          </h2>
          <p class="mb-3 text-sm text-hpd-muted">{{ 'healthConnect.firstLogin.body' | translate }}</p>
          <ul class="mb-5 grid list-disc gap-1.5 pl-5 text-sm text-hpd-primary-dark">
            <li>{{ 'healthConnect.firstLogin.dutyOfCare' | translate }}</li>
            <li>{{ 'healthConnect.firstLogin.dataProtection' | translate }}</li>
            <li>{{ 'healthConnect.firstLogin.rosterDiscipline' | translate }}</li>
          </ul>
          <button
            class="hpd-focusable hpd-btn hpd-btn-primary w-full"
            type="button"
            [disabled]="busy()"
            data-cy="acknowledge"
            (click)="acknowledge()"
          >
            {{ 'healthConnect.firstLogin.acknowledge' | translate }}
          </button>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class FirstLoginAcknowledgementComponent implements OnInit {
  private readonly api = inject(OnboardingApiService);
  private readonly accountService = inject(AccountService);
  private readonly alertService = inject(AlertService);

  readonly visible = signal(false);
  readonly busy = signal(false);

  ngOnInit(): void {
    this.accountService
      .getAuthenticationState()
      .pipe(
        switchMap(account => {
          if (!account) {
            return of(false);
          }
          // interstitial only once the application is ACTIVE and not yet acknowledged
          return forkJoin({
            status: this.api.acknowledgementStatus(),
            application: this.api.getOwnApplication().pipe(catchError(() => of(null))),
          }).pipe(map(({ status, application }) => application?.status === 'ACTIVE' && !status.acknowledged));
        }),
        catchError(() => of(false)),
      )
      .subscribe(show => this.visible.set(show));
  }

  acknowledge(): void {
    this.busy.set(true);
    this.api.acknowledge().subscribe({
      next: () => {
        this.busy.set(false);
        this.visible.set(false);
        this.alertService.showToast('healthConnect.toast.acknowledged');
      },
      error: () => {
        // 409 = already acknowledged elsewhere — treat as done, anything else re-enables the button
        this.busy.set(false);
        this.visible.set(false);
      },
    });
  }
}
