import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AlertService } from 'app/core/util/alert.service';

import { ComplianceApiService, ExpiringLicenseDto, OnboardingMetricsDto } from '../api/compliance-api.service';
import { OnboardingEventDto } from '../api/onboarding-api.service';

/**
 * WP7 operations dashboard (admin-only): onboarding funnel by status, careers
 * attribution counts by source (careers task 145), the expiring-license
 * watchlist with an on-demand sweep, and the cross-application audit feed.
 */
@Component({
  standalone: true,
  selector: 'hpd-compliance-page',
  imports: [RouterModule, TranslateModule],
  template: `
    <main class="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 class="sr-only">{{ 'healthConnect.compliance.title' | translate }}</h1>

      @if (loading()) {
        <p class="py-6 text-center text-hpd-muted">{{ 'healthConnect.states.loading' | translate }}</p>
      } @else {
        <!-- funnel tiles -->
        <div class="mb-4 grid gap-4 md:grid-cols-2">
          <section class="overflow-hidden rounded-hpd border border-hpd-border bg-white shadow-hpd-sm" data-cy="funnelByStatus">
            <h2
              class="m-0 border-b border-hpd-border bg-hpd-cream px-5 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-hpd-muted"
            >
              {{ 'healthConnect.compliance.byStatus' | translate }}
            </h2>
            <ul class="m-0 grid list-none gap-1.5 p-5">
              @for (entry of statusEntries(); track entry[0]) {
                <li class="flex items-center justify-between gap-3 text-sm">
                  <span class="text-hpd-muted">{{ 'healthConnect.onboarding.statuses.' + entry[0] | translate }}</span>
                  <span class="font-bold text-hpd-primary-dark">{{ entry[1] }}</span>
                </li>
              } @empty {
                <li class="py-2 text-center text-sm text-hpd-subtle">{{ 'healthConnect.states.empty' | translate }}</li>
              }
            </ul>
          </section>

          <section class="overflow-hidden rounded-hpd border border-hpd-border bg-white shadow-hpd-sm" data-cy="funnelBySource">
            <h2
              class="m-0 border-b border-hpd-border bg-hpd-cream px-5 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-hpd-muted"
            >
              {{ 'healthConnect.compliance.bySource' | translate }}
            </h2>
            <ul class="m-0 grid list-none gap-1.5 p-5">
              @for (entry of sourceEntries(); track entry[0]) {
                <li class="flex items-center justify-between gap-3 text-sm">
                  <span class="text-hpd-muted">{{ entry[0] }}</span>
                  <span class="font-bold text-hpd-primary-dark">{{ entry[1] }}</span>
                </li>
              } @empty {
                <li class="py-2 text-center text-sm text-hpd-subtle">{{ 'healthConnect.states.empty' | translate }}</li>
              }
            </ul>
          </section>
        </div>

        <!-- expiring licenses + sweep -->
        <section class="mb-4 overflow-hidden rounded-hpd border border-hpd-border bg-white shadow-hpd-sm" data-cy="expiringLicenses">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-hpd-border bg-hpd-cream px-5 py-2.5">
            <h2 class="m-0 text-[11.5px] font-bold uppercase tracking-wider text-hpd-muted">
              {{ 'healthConnect.compliance.expiring' | translate: { count: metrics()?.expiringLicenses30d ?? 0 } }}
            </h2>
            <button
              class="hpd-focusable hpd-btn hpd-btn-gold !px-3 !py-1.5 !text-xs"
              type="button"
              [disabled]="busy()"
              data-cy="runSweep"
              (click)="runSweep()"
            >
              {{ 'healthConnect.compliance.runSweep' | translate }}
            </button>
          </div>
          <ul class="m-0 grid list-none gap-2 p-5">
            @for (license of expiring(); track license.documentId) {
              <li class="flex flex-wrap items-center justify-between gap-3 rounded-hpd-sm border border-hpd-border px-3.5 py-2.5 text-sm">
                <span class="min-w-0 truncate text-hpd-primary-dark">
                  {{ license.login ?? license.profileId }}
                  <span class="text-hpd-muted">· {{ 'healthConnect.compliance.expires' | translate }} {{ license.expiryDate }}</span>
                </span>
                <span class="flex items-center gap-2">
                  <span
                    class="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                    [class]="isLapsed(license) ? 'bg-hpd-danger-tint text-hpd-danger' : 'bg-hpd-warning-tint text-hpd-warning'"
                  >
                    {{ (isLapsed(license) ? 'healthConnect.compliance.lapsed' : 'healthConnect.compliance.expiringSoon') | translate }}
                  </span>
                  @if (license.applicationId) {
                    <a class="hpd-focusable hpd-btn hpd-btn-ghost !px-2.5 !py-1 !text-xs" [routerLink]="['/review', license.applicationId]">
                      {{ 'healthConnect.review.open' | translate }}
                    </a>
                  }
                </span>
              </li>
            } @empty {
              <li class="py-3 text-center text-sm text-hpd-subtle">{{ 'healthConnect.compliance.noneExpiring' | translate }}</li>
            }
          </ul>
        </section>

        <!-- audit feed -->
        <section class="overflow-hidden rounded-hpd border border-hpd-border bg-white shadow-hpd-sm" data-cy="auditFeed">
          <h2
            class="m-0 border-b border-hpd-border bg-hpd-cream px-5 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-hpd-muted"
          >
            {{ 'healthConnect.compliance.auditFeed' | translate }}
          </h2>
          <ol class="m-0 grid list-none gap-2 p-5">
            @for (event of events(); track event.id) {
              <li class="rounded-hpd-sm border border-hpd-border px-3.5 py-2.5 text-sm">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="font-bold text-hpd-primary-dark">
                    {{ event.fromStatus ? ('healthConnect.onboarding.statuses.' + event.fromStatus | translate) : '—' }}
                    →
                    {{ event.toStatus ? ('healthConnect.onboarding.statuses.' + event.toStatus | translate) : '—' }}
                  </span>
                  <span class="text-xs text-hpd-subtle">{{ event.at?.slice(0, 16)?.replace('T', ' ') }}</span>
                </div>
                <div class="mt-1 text-xs text-hpd-muted">
                  {{ event.actor }}
                  @if (event.reason) {
                    <span> — {{ event.reason }}</span>
                  }
                  @if (event.applicationId) {
                    <a class="hpd-focusable ml-2 font-bold text-hpd-primary no-underline" [routerLink]="['/review', event.applicationId]">
                      {{ 'healthConnect.review.open' | translate }}
                    </a>
                  }
                </div>
              </li>
            } @empty {
              <li class="py-3 text-center text-sm text-hpd-subtle">{{ 'healthConnect.states.empty' | translate }}</li>
            }
          </ol>
        </section>
      }
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CompliancePageComponent implements OnInit {
  private readonly api = inject(ComplianceApiService);
  private readonly alertService = inject(AlertService);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly metrics = signal<OnboardingMetricsDto | null>(null);
  readonly expiring = signal<ExpiringLicenseDto[]>([]);
  readonly events = signal<OnboardingEventDto[]>([]);

  readonly statusEntries = computed(() => Object.entries(this.metrics()?.byStatus ?? {}).sort((a, b) => b[1] - a[1]));
  readonly sourceEntries = computed(() => Object.entries(this.metrics()?.bySource ?? {}).sort((a, b) => b[1] - a[1]));

  private readonly today = new Date().toISOString().slice(0, 10);

  ngOnInit(): void {
    this.refresh();
  }

  isLapsed(license: ExpiringLicenseDto): boolean {
    return license.expiryDate < this.today;
  }

  runSweep(): void {
    this.busy.set(true);
    this.api.sweep().subscribe({
      next: result => {
        this.busy.set(false);
        this.alertService.showToast('healthConnect.toast.sweepDone', { suspended: result.applicationsSuspended });
        this.refresh();
      },
      error: () => this.busy.set(false),
    });
  }

  private refresh(): void {
    this.api.metrics().subscribe({
      next: metrics => {
        this.metrics.set(metrics);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.api.expiring(30).subscribe({ next: licenses => this.expiring.set(licenses), error: () => this.expiring.set([]) });
    this.api.recentEvents().subscribe({ next: events => this.events.set(events), error: () => this.events.set([]) });
  }
}
