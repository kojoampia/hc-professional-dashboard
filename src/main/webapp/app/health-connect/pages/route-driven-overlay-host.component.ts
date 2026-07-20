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
import { TranslateModule } from '@ngx-translate/core';
import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';

@Component({
  standalone: true,
  selector: 'hpd-route-driven-overlay-host',
  imports: [RouterOutlet, TranslateModule],
  template: `
    <section
      #dialog
      class="hpd-route-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hpd-route-overlay-title"
      tabindex="-1"
      (keydown.escape)="close()"
      (keydown.tab)="trapFocus($event)"
    >
      <div class="hpd-surface p-4">
        <header class="d-flex justify-content-between align-items-center gap-2 mb-3">
          <h1 id="hpd-route-overlay-title" class="h4 m-0">{{ resolvedTitleKey() | translate: titleParams() }}</h1>
          <div class="hpd-route-overlay__actions hpd-no-print">
            <button class="hpd-focusable btn btn-outline-secondary" type="button" (click)="print()">
              {{ 'healthConnect.actions.print' | translate }}
            </button>
            <button #closeButton class="hpd-focusable btn btn-outline-secondary" type="button" (click)="close()">
              {{ 'healthConnect.actions.close' | translate }}
            </button>
          </div>
        </header>
        <router-outlet />
      </div>
    </section>
  `,
  styles: `
    .hpd-route-overlay {
      position: fixed;
      z-index: 1040;
      inset: 0;
      display: grid;
      place-items: start center;
      overflow: auto;
      padding: 2rem 1rem;
      background: rgb(11 15 26 / 60%);
    }
    .hpd-route-overlay > div {
      width: min(100%, var(--hpd-content-max-width));
    }
    .hpd-route-overlay__actions { display:flex; flex-wrap:wrap; gap:.5rem; }
    @media (max-width:375px) {
      .hpd-route-overlay { padding:.5rem; }
      .hpd-route-overlay > div { padding:1rem !important; }
      .hpd-route-overlay header { align-items:flex-start !important; flex-direction:column; }
    }
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
