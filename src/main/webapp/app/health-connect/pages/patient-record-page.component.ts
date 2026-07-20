import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [ActivityLogDialogComponent, CommonModule, FileUploadTriggerComponent, PaginationComponent, TranslateModule],
  template: `
    @if (record(); as patientRecord) {
      <article class="hpd-record">
        <section class="hpd-identity">
          @if (patientRecord.patient.avatarUrl) {
            <img [src]="patientRecord.patient.avatarUrl" [alt]="patientRecord.patient.patientName" />
          } @else {
            <span class="hpd-avatar" aria-hidden="true">{{ initials(patientRecord.patient.patientName) }}</span>
          }
          <div>
            <h2>{{ patientRecord.patient.patientName }}</h2>
            <dl>
              <dt>{{ 'healthConnect.patient.dateOfBirth' | translate }}</dt>
              <dd>{{ patientRecord.patient.dateOfBirth }}</dd>
              <dt>{{ 'healthConnect.patient.phone' | translate }}</dt>
              <dd>{{ patientRecord.patient.phone }}</dd>
              <dt>{{ 'healthConnect.patient.email' | translate }}</dt>
              <dd>{{ patientRecord.patient.email }}</dd>
              @if (patientRecord.patient.emergencyContact; as contact) {
                <dt>{{ 'healthConnect.patient.emergencyContact' | translate }}</dt>
                <dd>{{ contact.name }} · {{ contact.phone }}</dd>
              }
            </dl>
          </div>
        </section>
        <div class="hpd-record-grid">
          <section class="hpd-panel">
            <h2>{{ 'healthConnect.patient.cases' | translate }}</h2>
            @for (item of casePage().items; track item.id) {
              <button class="btn btn-link p-0 d-block" type="button" (click)="openCase(item.id)">{{ item.brief }}</button>
            } @empty {
              <p>{{ 'healthConnect.states.empty' | translate }}</p>
            }
            <hpd-pagination
              [totalPages]="casePage().totalPages"
              [initialPage]="casePage().page"
              (pageChange)="casePageNumber.set($event)"
            />
          </section>
          <section class="hpd-panel">
            <h2>{{ 'healthConnect.patient.visitations' | translate }}</h2>
            <ng-container
              [ngTemplateOutlet]="entries"
              [ngTemplateOutletContext]="{ page: visitationPage(), change: visitationPageNumber }"
            />
          </section>
          <section class="hpd-panel">
            <h2>{{ 'healthConnect.patient.activityTrail' | translate }}</h2>
            @if (canMutate()) {
              <button class="btn btn-outline-primary btn-sm mb-2" type="button" (click)="activityOpen.set(true)">
                {{ 'healthConnect.actions.edit' | translate }}
              </button>
            }
            <ng-container [ngTemplateOutlet]="entries" [ngTemplateOutletContext]="{ page: activityPage(), change: activityPageNumber }" />
          </section>
          <section class="hpd-panel">
            <h2>{{ 'healthConnect.patient.medications' | translate }}</h2>
            <ng-container
              [ngTemplateOutlet]="entries"
              [ngTemplateOutletContext]="{ page: medicationPage(), change: medicationPageNumber }"
            />
          </section>
          <section class="hpd-panel">
            <h2>{{ 'healthConnect.patient.reports' | translate }}</h2>
            <hpd-file-upload-trigger
              [labelKey]="'healthConnect.actions.upload'"
              [disabled]="!canMutate()"
              [acceptedTypes]="['application/pdf', 'image/png', 'image/jpeg']"
              (filesSelected)="upload($event)"
            />
            @for (report of reportPage().items; track report.id) {
              <p>{{ report.label }}</p>
            } @empty {
              <p>{{ 'healthConnect.states.empty' | translate }}</p>
            }
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
      @for (entry of page.items; track entry.id) {
        <p>{{ entry.label }}</p>
      } @empty {
        <p>{{ 'healthConnect.states.empty' | translate }}</p>
      }
      <hpd-pagination [totalPages]="page.totalPages" [initialPage]="page.page" (pageChange)="change.set($event)" />
    </ng-template>
  `,
  styles: `
    .hpd-identity { display:flex; gap:1rem; align-items:start; } .hpd-avatar { display:grid; place-items:center; width:4rem; height:4rem; border-radius:50%; background:var(--hpd-color-primary); color:white; font-weight:bold; }
    dl { display:grid; grid-template-columns:auto 1fr; gap:.25rem .75rem; } dd { margin:0; } .hpd-record-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem; margin-top:1rem; } .hpd-panel { padding:1rem; border:1px solid var(--hpd-color-border); } @media (max-width: 600px) { .hpd-record-grid { grid-template-columns:1fr; } }
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
    if (file && this.canMutate()) {
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
