import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { AccountService } from 'app/core/auth/account.service';

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
            <h2 id="hpd-patient-identity-heading" class="text-lg font-bold text-slate-900">{{ patientRecord.patient.patientName }}</h2>
            <dl class="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt class="text-slate-500">{{ 'healthConnect.patient.dateOfBirth' | translate }}</dt>
              <dd class="text-slate-700">{{ patientRecord.patient.dateOfBirth }}</dd>
              <dt class="text-slate-500">{{ 'healthConnect.patient.phone' | translate }}</dt>
              <dd class="text-slate-700">{{ patientRecord.patient.phone }}</dd>
              <dt class="text-slate-500">{{ 'healthConnect.patient.email' | translate }}</dt>
              <dd class="text-slate-700">{{ patientRecord.patient.email }}</dd>
              @if (patientRecord.patient.emergencyContact; as contact) {
                <dt class="text-slate-500">{{ 'healthConnect.patient.emergencyContact' | translate }}</dt>
                <dd class="text-slate-700">{{ contact.name }} · {{ contact.phone }}</dd>
              }
            </dl>
          </div>
        </section>
        <div class="hpd-record-grid grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <section class="hpd-panel rounded-xl border border-slate-100 bg-white p-5 shadow-sm" aria-labelledby="hpd-patient-cases-heading">
            <h2 id="hpd-patient-cases-heading" class="mb-3 flex items-center gap-2 font-bold text-slate-800">
              <mat-icon aria-hidden="true" class="!text-lg text-slate-400">folder_shared</mat-icon>
              {{ 'healthConnect.patient.cases' | translate }}
            </h2>
            <ul class="divide-y divide-slate-50 text-sm">
              @for (item of casePage().items; track item.id) {
                <li>
                  <button
                    class="hpd-focusable w-full rounded px-1 py-2 text-left text-slate-700 hover:bg-slate-50"
                    type="button"
                    (click)="openCase(item.id)"
                  >
                    {{ item.brief }}
                  </button>
                </li>
              } @empty {
                <li class="py-4 text-center text-slate-400">{{ 'healthConnect.states.empty' | translate }}</li>
              }
            </ul>
            <hpd-pagination
              [totalPages]="casePage().totalPages"
              [initialPage]="casePage().page"
              (pageChange)="casePageNumber.set($event)"
            />
          </section>
          <section
            class="hpd-panel rounded-xl border border-slate-100 bg-white p-5 shadow-sm"
            aria-labelledby="hpd-patient-visitations-heading"
          >
            <h2 id="hpd-patient-visitations-heading" class="mb-3 flex items-center gap-2 font-bold text-slate-800">
              <mat-icon aria-hidden="true" class="!text-lg text-slate-400">event</mat-icon>
              {{ 'healthConnect.patient.visitations' | translate }}
            </h2>
            <ng-container
              [ngTemplateOutlet]="entries"
              [ngTemplateOutletContext]="{ page: visitationPage(), change: visitationPageNumber }"
            />
          </section>
          <section
            class="hpd-panel rounded-xl border border-slate-100 bg-white p-5 shadow-sm"
            aria-labelledby="hpd-patient-activity-heading"
          >
            <h2 id="hpd-patient-activity-heading" class="mb-3 flex items-center gap-2 font-bold text-slate-800">
              <mat-icon aria-hidden="true" class="!text-lg text-slate-400">timeline</mat-icon>
              {{ 'healthConnect.patient.activityTrail' | translate }}
            </h2>
            @if (canMutate()) {
              <button
                class="hpd-focusable hpd-no-print mb-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
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
            class="hpd-panel rounded-xl border border-slate-100 bg-white p-5 shadow-sm"
            aria-labelledby="hpd-patient-medications-heading"
          >
            <h2 id="hpd-patient-medications-heading" class="mb-3 flex items-center gap-2 font-bold text-slate-800">
              <mat-icon aria-hidden="true" class="!text-lg text-slate-400">medication</mat-icon>
              {{ 'healthConnect.patient.medications' | translate }}
            </h2>
            <ng-container
              [ngTemplateOutlet]="entries"
              [ngTemplateOutletContext]="{ page: medicationPage(), change: medicationPageNumber }"
            />
          </section>
          <section
            class="hpd-panel rounded-xl border border-slate-100 bg-white p-5 shadow-sm"
            aria-labelledby="hpd-patient-reports-heading"
          >
            <h2 id="hpd-patient-reports-heading" class="mb-3 flex items-center gap-2 font-bold text-slate-800">
              <mat-icon aria-hidden="true" class="!text-lg text-slate-400">summarize</mat-icon>
              {{ 'healthConnect.patient.reports' | translate }}
            </h2>
            <hpd-file-upload-trigger
              [labelKey]="'healthConnect.actions.upload'"
              [disabled]="!canManageReports()"
              [acceptedTypes]="['application/pdf', 'image/png', 'image/jpeg']"
              (filesSelected)="upload($event)"
            />
            <ul class="mt-2 divide-y divide-slate-50 text-sm">
              @for (report of reportPage().items; track report.id) {
                <li class="py-2 text-slate-700">{{ report.label }}</li>
              } @empty {
                <li class="py-4 text-center text-slate-400">{{ 'healthConnect.states.empty' | translate }}</li>
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
      <ul class="divide-y divide-slate-50 text-sm">
        @for (entry of page.items; track entry.id) {
          <li class="py-2 text-slate-700">{{ entry.label }}</li>
        } @empty {
          <li class="py-4 text-center text-slate-400">{{ 'healthConnect.states.empty' | translate }}</li>
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
