import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import dayjs from 'dayjs/esm';

import LineChartComponent from '../charts/line-chart.component';
import { LineChartPoint } from '../health-connect.models';
import { EarningsApiService } from '../api/earnings-api.service';
import { EarningsGranularity, ProfessionalEarningsDto, ProfessionalShiftDto } from '../api/earnings-api.model';

const GRANULARITIES: readonly EarningsGranularity[] = ['DAILY', 'WEEKLY', 'MONTHLY'];

/**
 * What this clinician has worked, and what it came to.
 *
 * **Read-only, and there is nothing to add here later.** Wage rates are set by administrators in
 * hc-admin; this screen shows the money a professional's own shifts accrued and never the table
 * that priced them. There is no rate on the wire to render even if a control were added.
 *
 * Three things on this page exist because the figures are meaningless without them:
 *
 * - **The window comes from the response, not the request.** A shift becomes payable only once the
 *   day is over, so the server clips the range at yesterday and reports where it actually ended.
 *   Labelling the chart with what was asked for would caption it with a range it does not contain.
 * - **Unpriced shifts are called out separately.** They count as worked and contribute nothing to
 *   the total, so without a line saying so, "no rate has been configured for your role" and "you
 *   earned nothing" are the same screen.
 * - **The roster keeps its unpaid rows.** Off days and future shifts are shown and marked, because
 *   a schedule with the unpaid parts removed is not a schedule.
 */
@Component({
  standalone: true,
  selector: 'hpd-earnings-page',
  imports: [LineChartComponent, TranslateModule],
  template: `
    <main class="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8">
      <h1 class="sr-only">{{ 'healthConnect.earnings.title' | translate }}</h1>

      @if (loading()) {
        <p class="py-6 text-center text-hpd-muted">{{ 'healthConnect.states.loading' | translate }}</p>
      } @else if (unavailable()) {
        <!--
          404 from the server: this account has no clinical record behind it yet. Deliberately not
          the generic error state — nothing is broken, there is simply nothing to show, and telling
          someone mid-onboarding that loading failed would send them to support for no reason.
        -->
        <p class="rounded-hpd border border-hpd-border bg-white p-6 text-center text-hpd-muted shadow-hpd-sm" data-cy="earningsNoRecord">
          {{ 'healthConnect.earnings.noRecord' | translate }}
        </p>
      } @else if (failed()) {
        <p class="py-6 text-center text-hpd-muted">{{ 'healthConnect.states.error' | translate }}</p>
      } @else {
        <!-- Nested rather than a fourth else-if branch: an "as" binding is only allowed on a primary if. -->
        @if (earnings(); as summary) {
          <section class="grid gap-4 md:grid-cols-3" aria-labelledby="hpd-earnings-summary" data-cy="earningsSummary">
            <h2 id="hpd-earnings-summary" class="sr-only">{{ 'healthConnect.earnings.summary' | translate }}</h2>

            <div class="rounded-hpd border border-hpd-border bg-white p-4 shadow-hpd-sm">
              <p class="m-0 text-[11px] font-bold uppercase tracking-wider text-hpd-muted">
                {{ 'healthConnect.earnings.totalAccrued' | translate }}
              </p>
              <p class="m-0 mt-1 text-[26px] font-extrabold leading-none tracking-tight text-hpd-primary-dark" data-cy="earningsTotal">
                {{ money(summary.totalAccrued, summary.currency) }}
              </p>
            </div>

            <div class="rounded-hpd border border-hpd-border bg-white p-4 shadow-hpd-sm">
              <p class="m-0 text-[11px] font-bold uppercase tracking-wider text-hpd-muted">
                {{ 'healthConnect.earnings.shiftsCompleted' | translate }}
              </p>
              <p class="m-0 mt-1 text-[26px] font-extrabold leading-none tracking-tight text-hpd-primary-dark">
                {{ summary.shiftsCompleted }}
              </p>
            </div>

            <div class="rounded-hpd border border-hpd-border bg-white p-4 shadow-hpd-sm">
              <p class="m-0 text-[11px] font-bold uppercase tracking-wider text-hpd-muted">
                {{ 'healthConnect.earnings.period' | translate }}
              </p>
              <p class="m-0 mt-1 text-sm font-semibold leading-snug text-hpd-primary-dark" data-cy="earningsWindow">
                {{ windowLabel() }}
              </p>
              <p class="m-0 mt-1 text-xs text-hpd-subtle">{{ 'healthConnect.earnings.paidThrough' | translate }}</p>
            </div>
          </section>

          @if (summary.unpricedShifts > 0) {
            <p class="m-0 rounded-hpd border border-hpd-border bg-hpd-cream p-4 text-sm text-hpd-muted" data-cy="earningsUnpriced">
              {{ 'healthConnect.earnings.unpriced' | translate: { count: summary.unpricedShifts } }}
            </p>
          }

          <section aria-labelledby="hpd-earnings-granularity">
            <h2 id="hpd-earnings-granularity" class="sr-only">{{ 'healthConnect.earnings.granularity' | translate }}</h2>
            <div class="flex flex-wrap gap-2" role="group" [attr.aria-label]="'healthConnect.earnings.granularity' | translate">
              @for (option of granularities; track option) {
                <button
                  type="button"
                  [class]="option === granularity() ? 'hpd-btn-primary' : 'hpd-btn-ghost'"
                  [attr.aria-pressed]="option === granularity()"
                  [attr.data-cy]="'granularity-' + option"
                  (click)="selectGranularity(option)"
                >
                  {{ 'healthConnect.earnings.granularities.' + option | translate }}
                </button>
              }
            </div>
          </section>

          <hpd-line-chart
            [points]="seriesPoints()"
            titleKey="healthConnect.earnings.series"
            descriptionKey="healthConnect.earnings.seriesDescription"
            legendKey="healthConnect.earnings.accrued"
            xAxisKey="healthConnect.earnings.periodStart"
            yAxisKey="healthConnect.earnings.accrued"
          />

          <section class="overflow-hidden rounded-hpd border border-hpd-border bg-white shadow-hpd-sm" data-cy="earningsRoster">
            <h2
              class="m-0 border-b border-hpd-border bg-hpd-cream px-5 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-hpd-muted"
            >
              {{ 'healthConnect.earnings.roster' | translate }}
            </h2>
            <ul class="m-0 list-none divide-y divide-hpd-border p-0">
              @for (shift of shifts(); track shift.date + shift.shift) {
                <li class="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span class="font-semibold text-hpd-primary-dark">{{ day(shift.date) }}</span>
                  <span class="text-hpd-muted">{{ 'healthConnect.earnings.shiftNames.' + shift.shift | translate }}</span>
                  <span class="text-xs" [class]="shift.payable ? 'font-bold text-hpd-success' : 'text-hpd-subtle'">
                    {{ (shift.payable ? 'healthConnect.earnings.payable' : 'healthConnect.earnings.notPayable') | translate }}
                  </span>
                </li>
              } @empty {
                <li class="py-3 text-center text-sm text-hpd-subtle">{{ 'healthConnect.states.empty' | translate }}</li>
              }
            </ul>
          </section>
        }
      }
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EarningsPageComponent implements OnInit {
  private readonly api = inject(EarningsApiService);
  private readonly translate = inject(TranslateService);

  readonly granularities = GRANULARITIES;

  readonly loading = signal(true);
  readonly failed = signal(false);
  /** 404 rather than a failure: an account with no professional record behind it. */
  readonly unavailable = signal(false);
  readonly granularity = signal<EarningsGranularity>('MONTHLY');
  readonly earnings = signal<ProfessionalEarningsDto | null>(null);
  readonly shifts = signal<ProfessionalShiftDto[]>([]);

  readonly seriesPoints = computed<readonly LineChartPoint[]>(() =>
    (this.earnings()?.buckets ?? []).map(bucket => ({ x: bucket.periodStart, y: bucket.amount })),
  );

  /**
   * The range actually covered, read off the response. See the class comment: the server clips the
   * end of the window to the last day that can have been worked, so the request's `to` may name a
   * date the figures do not include.
   */
  readonly windowLabel = computed(() => {
    const summary = this.earnings();
    return summary ? `${this.day(summary.from)} – ${this.day(summary.to)}` : '';
  });

  ngOnInit(): void {
    this.loadEarnings();
    this.loadShifts();
  }

  selectGranularity(granularity: EarningsGranularity): void {
    if (granularity === this.granularity()) {
      return;
    }
    this.granularity.set(granularity);
    this.loadEarnings();
  }

  day(iso: string): string {
    return iso ? dayjs(iso).format('D MMM YYYY') : '';
  }

  /**
   * Formatted in the user's current language, with the currency the rates were denominated in.
   *
   * `Intl` directly rather than Angular's `CurrencyPipe`: that pipe needs locale data registered
   * for every non-English locale, and this app ships four. A missing registration throws at render
   * time, which would take the whole page down over a number's decimal separator.
   *
   * A null currency means nothing in the window was priced and the role has no current rate either
   * — show the bare figure rather than inventing a denomination for it.
   */
  money(amount: number, currency: string | null): string {
    const locale = this.translate.currentLang || 'en';
    return currency
      ? new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
      : new Intl.NumberFormat(locale).format(amount);
  }

  private loadEarnings(): void {
    this.loading.set(true);
    this.api.ownEarnings({ granularity: this.granularity() }).subscribe({
      next: earnings => {
        this.earnings.set(earnings);
        this.unavailable.set(false);
        this.failed.set(false);
        this.loading.set(false);
      },
      error: (error: { status?: number }) => {
        this.unavailable.set(error.status === 404);
        this.failed.set(error.status !== 404);
        this.loading.set(false);
      },
    });
  }

  private loadShifts(): void {
    this.api.ownShifts().subscribe({
      next: shifts => this.shifts.set(shifts),
      error: () => this.shifts.set([]),
    });
  }
}
