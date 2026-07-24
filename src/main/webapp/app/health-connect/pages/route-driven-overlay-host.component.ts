import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  computed,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';

@Component({
  standalone: true,
  selector: 'hpd-route-driven-overlay-host',
  imports: [MatIconModule, RouterOutlet, TranslateModule],
  template: `
    <section
      #dialog
      class="hpd-route-overlay fixed inset-0 z-[1040] overflow-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hpd-route-overlay-title"
      tabindex="-1"
      (keydown.escape)="close()"
      (keydown.tab)="trapFocus($event)"
    >
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true"></div>
      <div
        class="hpd-surface relative mx-auto mt-4 flex max-w-6xl flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl sm:mt-10"
      >
        <header class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <h1 id="hpd-route-overlay-title" class="m-0 text-lg font-bold text-slate-900">
            {{ resolvedTitleKey() | translate: titleParams() }}
          </h1>
          <div class="hpd-route-overlay__actions hpd-no-print flex flex-wrap items-center gap-2">
            <button
              class="hpd-focusable flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
              type="button"
              (click)="print()"
            >
              <mat-icon aria-hidden="true" class="!text-base">print</mat-icon>
              {{ 'healthConnect.actions.print' | translate }}
            </button>
            <button
              #closeButton
              class="hpd-focusable flex items-center gap-1 rounded-full bg-slate-700 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              type="button"
              (click)="close()"
            >
              <mat-icon aria-hidden="true" class="!text-base">close</mat-icon>
              {{ 'healthConnect.actions.close' | translate }}
            </button>
          </div>
        </header>
        <div class="flex-1 overflow-y-auto bg-slate-50/30 p-6">
          <router-outlet />
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RouteDrivenOverlayHostComponent implements AfterViewInit, OnDestroy {
  @ViewChild('dialog') dialog?: ElementRef<HTMLElement>;
  @ViewChild('closeButton') closeButton?: ElementRef<HTMLButtonElement>;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly repository = inject(HEALTH_CONNECT_REPOSITORY);
  @Input() titleKey = '';
  @Input() closeUrl = '';
  readonly patient = computed(() => this.repository.findPatient(this.route.snapshot.paramMap.get('patientId') ?? ''));
  readonly clinicalCase = computed(() => this.repository.findCase(this.route.snapshot.paramMap.get('caseId') ?? ''));
  readonly resolvedTitleKey = computed(
    () => this.titleKey || (this.clinicalCase() ? 'healthConnect.case.detail' : 'healthConnect.patient.record'),
  );
  readonly titleParams = computed(() =>
    this.clinicalCase()
      ? { number: this.clinicalCase()?.id ?? '' }
      : { name: this.patient()?.patient.patientName ?? this.route.snapshot.paramMap.get('patientId') ?? '' },
  );
  private activeElement: HTMLElement | null = null;

  ngAfterViewInit(): void {
    this.activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.closeButton?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    this.activeElement?.focus();
  }

  close(): void {
    if (this.closeUrl) {
      void this.router.navigateByUrl(this.closeUrl);
      return;
    }
    const closeUrl = this.clinicalCase() ? '/cases' : '/patients';
    void this.router.navigate([closeUrl], { queryParams: this.route.snapshot.queryParams });
  }

  print(): void {
    window.print();
  }

  trapFocus(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    const focusable = Array.from(
      this.dialog?.nativeElement.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );
    if (!focusable.length) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (keyboardEvent.shiftKey && document.activeElement === first) {
      keyboardEvent.preventDefault();
      last.focus();
    } else if (!keyboardEvent.shiftKey && document.activeElement === last) {
      keyboardEvent.preventDefault();
      first.focus();
    }
  }
}
