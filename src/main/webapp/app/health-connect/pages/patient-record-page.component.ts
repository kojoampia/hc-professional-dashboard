import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { AccountService } from 'app/core/auth/account.service';
import { AlertService } from 'app/core/util/alert.service';

import { hasHealthConnectPermission } from '../authority-role';
import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';
import { Page, RecordEntry } from '../health-connect.models';
import FileUploadTriggerComponent from '../../shared/health-connect/form-controls/file-upload-trigger.component';
import PaginationComponent from '../../shared/health-connect/data-table/pagination.component';
import ActivityLogDialogComponent from './activity-log-dialog.component';

const PAGE_SIZE = 3;

@Component({
  standalone: true,
  selector: 'hpd-patient-record-page',
  imports: [ActivityLogDialogComponent, CommonModule, FileUploadTriggerComponent, MatIconModule, PaginationComponent, TranslateModule],
  template: `
    @if (record(); as patientRecord) {
      <article class="hpd-record mx-auto max-w-6xl">
        <section class="hpd-identity mb-6 flex items-start gap-4" aria-labelledby="hpd-patient-identity-heading">
          @if (patientRecord.patient.avatarUrl) {
            <img
              [src]="patientRecord.patient.avatarUrl"
              [alt]="patientRecord.patient.patientName"
              class="h-16 w-16 rounded-full object-cover"
            />
          } @else {
            <span
              class="hpd-avatar grid h-16 w-16 place-items-center rounded-full bg-hpd-primary font-bold text-white"
              aria-hidden="true"
              >{{ initials(patientRecord.patient.patientName) }}</span
            >
          }
          <div>
            <h2 id="hpd-patient-identity-heading" class="text-lg font-bold text-hpd-primary-dark">
              {{ patientRecord.patient.patientName }}
            </h2>
            <dl class="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt class="text-hpd-muted">{{ 'healthConnect.patient.dateOfBirth' | translate }}</dt>
              <dd class="text-hpd-primary-dark">{{ patientRecord.patient.dateOfBirth }}</dd>
              <dt class="text-hpd-muted">{{ 'healthConnect.patient.phone' | translate }}</dt>
              <dd class="text-hpd-primary-dark">{{ patientRecord.patient.phone }}</dd>
              <dt class="text-hpd-muted">{{ 'healthConnect.patient.email' | translate }}</dt>
              <dd class="text-hpd-primary-dark">{{ patientRecord.patient.email }}</dd>
              @if (patientRecord.patient.emergencyContact; as contact) {
                <dt class="text-hpd-muted">{{ 'healthConnect.patient.emergencyContact' | translate }}</dt>
                <dd class="text-hpd-primary-dark">{{ contact.name }} · {{ contact.phone }}</dd>
              }
            </dl>
          </div>
        </section>
        <div class="hpd-record-grid grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <section
            class="hpd-panel overflow-hidden rounded-hpd border border-hpd-border bg-white p-5 shadow-hpd-sm"
            aria-labelledby="hpd-patient-cases-heading"
          >
            <h2
              id="hpd-patient-cases-heading"
              class="-mx-5 -mt-5 mb-3 flex items-center gap-2 rounded-t-hpd border-b border-hpd-border bg-hpd-cream px-5 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-hpd-muted"
            >
              <mat-icon aria-hidden="true" class="!text-lg text-hpd-subtle">folder_shared</mat-icon>
              {{ 'healthConnect.patient.cases' | translate }}
            </h2>
            <ul class="m-0 list-none divide-y divide-hpd-border/60 p-0 text-sm">
              @for (item of casePage().items; track item.id) {
                <li>
                  <button
                    class="hpd-focusable w-full rounded px-1 py-2 text-left text-hpd-primary-dark hover:bg-hpd-cream/70"
                    type="button"
                    (click)="openCase(item.id)"
                  >
                    {{ item.brief }}
                  </button>
                </li>
              } @empty {
                <li class="py-4 text-center text-hpd-subtle">{{ 'healthConnect.states.empty' | translate }}</li>
              }
            </ul>
            <hpd-pagination
              [totalPages]="casePage().totalPages"
              [initialPage]="casePage().page"
              (pageChange)="casePageNumber.set($event)"
            />
          </section>
          <section
            class="hpd-panel overflow-hidden rounded-hpd border border-hpd-border bg-white p-5 shadow-hpd-sm"
            aria-labelledby="hpd-patient-visitations-heading"
          >
            <h2
              id="hpd-patient-visitations-heading"
              class="-mx-5 -mt-5 mb-3 flex items-center gap-2 rounded-t-hpd border-b border-hpd-border bg-hpd-cream px-5 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-hpd-muted"
            >
              <mat-icon aria-hidden="true" class="!text-lg text-hpd-subtle">event</mat-icon>
              {{ 'healthConnect.patient.visitations' | translate }}
            </h2>
            <ng-container
              [ngTemplateOutlet]="entries"
              [ngTemplateOutletContext]="{ page: visitationPage(), change: visitationPageNumber }"
            />
          </section>
          <section
            class="hpd-panel overflow-hidden rounded-hpd border border-hpd-border bg-white p-5 shadow-hpd-sm"
            aria-labelledby="hpd-patient-activity-heading"
          >
            <h2
              id="hpd-patient-activity-heading"
              class="-mx-5 -mt-5 mb-3 flex items-center gap-2 rounded-t-hpd border-b border-hpd-border bg-hpd-cream px-5 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-hpd-muted"
            >
              <mat-icon aria-hidden="true" class="!text-lg text-hpd-subtle">timeline</mat-icon>
              {{ 'healthConnect.patient.activityTrail' | translate }}
            </h2>
            @if (canMutate()) {
              <button
                class="hpd-focusable hpd-no-print mb-2 cursor-pointer rounded-hpd-sm border-[1.5px] border-hpd-border bg-white px-3 py-1.5 text-xs font-bold text-hpd-primary-dark hover:border-hpd-primary"
                type="button"
                aria-haspopup="dialog"
                (click)="activityOpen.set(true)"
              >
                {{ 'healthConnect.actions.edit' | translate }}
              </button>
            }
            <ng-container [ngTemplateOutlet]="entries" [ngTemplateOutletContext]="{ page: activityPage(), change: activityPageNumber }" />
          </section>
          <section
            class="hpd-panel overflow-hidden rounded-hpd border border-hpd-border bg-white p-5 shadow-hpd-sm"
            aria-labelledby="hpd-patient-medications-heading"
          >
            <h2
              id="hpd-patient-medications-heading"
              class="-mx-5 -mt-5 mb-3 flex items-center gap-2 rounded-t-hpd border-b border-hpd-border bg-hpd-cream px-5 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-hpd-muted"
            >
              <mat-icon aria-hidden="true" class="!text-lg text-hpd-subtle">medication</mat-icon>
              {{ 'healthConnect.patient.medications' | translate }}
            </h2>
            <ng-container
              [ngTemplateOutlet]="entries"
              [ngTemplateOutletContext]="{ page: medicationPage(), change: medicationPageNumber }"
            />
          </section>
          <section
            class="hpd-panel overflow-hidden rounded-hpd border border-hpd-border bg-white p-5 shadow-hpd-sm"
            aria-labelledby="hpd-patient-reports-heading"
          >
            <h2
              id="hpd-patient-reports-heading"
              class="-mx-5 -mt-5 mb-3 flex items-center gap-2 rounded-t-hpd border-b border-hpd-border bg-hpd-cream px-5 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-hpd-muted"
            >
              <mat-icon aria-hidden="true" class="!text-lg text-hpd-subtle">summarize</mat-icon>
              {{ 'healthConnect.patient.reports' | translate }}
            </h2>
            <hpd-file-upload-trigger
              [labelKey]="'healthConnect.actions.upload'"
              [disabled]="!canManageReports()"
              [acceptedTypes]="['application/pdf', 'image/png', 'image/jpeg']"
              (filesSelected)="upload($event)"
            />
            <ul class="m-0 mt-2 list-none divide-y divide-hpd-border/60 p-0 text-sm">
              @for (report of reportPage().items; track report.id) {
                <li class="py-2 text-hpd-primary-dark">{{ report.label }}</li>
              } @empty {
                <li class="py-4 text-center text-hpd-subtle">{{ 'healthConnect.states.empty' | translate }}</li>
              }
            </ul>
            <hpd-pagination
              [totalPages]="reportPage().totalPages"
              [initialPage]="reportPage().page"
              (pageChange)="reportPageNumber.set($event)"
            />
          </section>
        </div>
        @if (activityOpen()) {
          <hpd-activity-log-dialog [patientId]="patientRecord.patient.id" (closed)="activityOpen.set(false)" />
        }
      </article>
    } @else {
      <p role="alert">{{ 'healthConnect.states.empty' | translate }}</p>
    }
    <ng-template #entries let-page="page" let-change="change">
      <ul class="m-0 list-none divide-y divide-hpd-border/60 p-0 text-sm">
        @for (entry of page.items; track entry.id) {
          <li class="py-2 text-hpd-primary-dark">{{ entry.label }}</li>
        } @empty {
          <li class="py-4 text-center text-hpd-subtle">{{ 'healthConnect.states.empty' | translate }}</li>
        }
      </ul>
      <hpd-pagination [totalPages]="page.totalPages" [initialPage]="page.page" (pageChange)="change.set($event)" />
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PatientRecordPageComponent {
  readonly repository = inject(HEALTH_CONNECT_REPOSITORY);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly account = inject(AccountService);
  private readonly alertService = inject(AlertService);
  readonly patientId = this.route.parent?.snapshot.paramMap.get('patientId') ?? '';
  readonly record = computed(() => this.repository.findPatient(this.patientId));
  private readonly currentAccount = toSignal(this.account.getAuthenticationState(), { initialValue: null });
  readonly canMutate = computed(() => hasHealthConnectPermission(this.currentAccount()?.authorities, 'manageActivity'));
  readonly canManageReports = computed(() => hasHealthConnectPermission(this.currentAccount()?.authorities, 'manageReport'));
  readonly casePageNumber = signal(1);
  readonly visitationPageNumber = signal(1);
  readonly activityPageNumber = signal(1);
  readonly medicationPageNumber = signal(1);
  readonly reportPageNumber = signal(1);
  readonly casePage = computed(() => this.page(this.record()?.cases ?? [], this.casePageNumber()));
  readonly visitationPage = computed(() => this.page(this.record()?.visitations ?? [], this.visitationPageNumber()));
  readonly activityPage = computed(() => this.page(this.record()?.activities ?? [], this.activityPageNumber()));
  readonly medicationPage = computed(() => this.page(this.record()?.medications ?? [], this.medicationPageNumber()));
  readonly reportPage = computed(() => this.page(this.record()?.reports ?? [], this.reportPageNumber()));
  readonly activityOpen = signal(false);
  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();
  }
  openCase(id: string): void {
    void this.router.navigate(['/patients', this.patientId, 'cases', id]);
  }
  upload(files: readonly File[]): void {
    const file = files[0];
    if (file && this.canManageReports()) {
      this.repository.appendReport(this.patientId, { reportType: file.type, url: file.name });
      this.alertService.showToast('healthConnect.toast.reportUploaded');
    }
  }
  private page<T>(items: readonly T[], page: number): Page<T> {
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const selected = Math.min(page, totalPages);
    return {
      items: items.slice((selected - 1) * PAGE_SIZE, selected * PAGE_SIZE),
      page: selected,
      pageSize: PAGE_SIZE,
      totalItems: items.length,
      totalPages,
    };
  }
}
