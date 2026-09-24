import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { AccountService } from 'app/core/auth/account.service';
import { AlertService } from 'app/core/util/alert.service';

import { hasHealthConnectPermission } from '../authority-role';
import { RecordRestrictedPart } from '../api/restricted-parts';
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
      <article class="hpd-record w-full">
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
            <!--
              The whole of backlog item 126. The api serves a pharmacist this record without the
              activity log and names that in the X-Restricted-Parts header; unread, the panel below
              renders an empty list and "Nothing to show.", which is exactly what a patient nobody
              has touched looks like. On the directory that conflation cost a column; here it is a
              clinical reading, made while deciding what to do next.

              In place of the list, not above it: every entry is withheld, so leaving an empty list
              and a paginator under a notice would go on showing the false sentence beside the true
              one. The Edit button stays - a pharmacist may write to a log they may not read, which
              is the server's rule and not this screen's to reinterpret.
            -->
            @if (restricted('lastActivity')) {
              <p
                class="m-0 flex items-start gap-2 rounded-hpd-sm border border-hpd-border bg-hpd-cream px-3 py-3 text-sm text-hpd-muted"
                role="status"
                data-cy="recordRestrictedLastActivity"
              >
                <mat-icon class="!h-5 !w-5 shrink-0 !text-[20px]" aria-hidden="true">visibility_off</mat-icon>
                <span>{{ 'healthConnect.patient.recordRestricted.lastActivity' | translate }}</span>
              </p>
            } @else {
              <ng-container [ngTemplateOutlet]="entries" [ngTemplateOutletContext]="{ page: activityPage(), change: activityPageNumber }" />
            }
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
      <!--
        WHY THERE IS NO RECORD, rather than one sentence for every reason there might not be (item
        146).

        The record read's two failure handlers used to write the repository's single shared error
        signal — which this page does not read — so their only visible effect was to blank the
        directory, the dashboard and the case queue, while this page went on saying "no records
        found" about a read that had been refused or had 503'd. Both halves were wrong: three
        surfaces were blanked by a read they had no part in, and the one surface that WAS looking at
        it was told the patient had nothing.

        The empty sentence survives as the default because it is still the right one for a ready
        read of a patient with nothing recorded, and for idle — an id nobody has asked for yet.

        WHY THE @switch SITS INSIDE A LIVE REGION IT DOES NOT CREATE (item 204).

        Every arm below is its own live region, and each one used to be INSERTED TOGETHER WITH ITS
        TEXT by the arm that rendered it. role="alert" is assertive and does announce on insertion;
        role="status" is polite and generally does not — a polite region has to EXIST BEFORE ITS
        CONTENT CHANGES to be read out. So the two treatments that announced were the two reporting
        that something had gone wrong, and the refusal — the one a technician meets on every single
        load, by hc-patient's scope of practice — was the one least likely to be heard.

        The wrapper is the fix and the roles are not. It is present for as long as there is no
        record, so swapping one arm for another is a CONTENT CHANGE inside a region that was already
        there. The status/alert split is item 146's and stays exactly as it was: a refusal and a read
        in flight are not errors, and announcing them assertively would interrupt.

        aria-live on a stable wrapper is what shared/health-connect/async-state/async-state.component.ts
        already does one directory over, which is why it is spelled the same way here.

        WHAT THIS CANNOT DO, so nobody reads more into it: the wrapper arrives with the @else itself,
        so whichever state is on screen at the FIRST render is still inserted with its text. Every
        transition after that — and a refusal is always one, because the read must be in flight
        before it can be refused — changes the content of a region that already exists. No screen
        reader was run; this rests on documented live-region behaviour, not on an observation.
      -->
      <div aria-live="polite" aria-atomic="true" data-cy="recordStateRegion">
        @switch (recordState().status) {
          @case ('forbidden') {
            <p role="status" data-cy="recordForbidden">{{ 'healthConnect.states.forbidden' | translate }}</p>
          }
          @case ('error') {
            <p role="alert" data-cy="recordFailed">{{ 'healthConnect.states.error' | translate }}</p>
          }
          @case ('loading') {
            <p role="status" data-cy="recordLoading">{{ 'healthConnect.states.loading' | translate }}</p>
          }
          @default {
            <p role="alert" data-cy="recordEmpty">{{ 'healthConnect.states.empty' | translate }}</p>
          }
        }
      </div>
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
  /**
   * How this patient's read went, for the `@else` above.
   *
   * <p>A `computed` over a method that reads a signal internally — the same shape `record` uses —
   * so it re-evaluates when the response lands. Read only when there is no record: a record on
   * screen is a record, whatever a later refresh reports.
   */
  readonly recordState = computed(() => this.repository.recordState(this.patientId));
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

  /**
   * Whether the read that produced this record was refused one named part.
   *
   * <p>Asked per part from `RECORD_RESTRICTED_PARTS` rather than by looping what arrived, so
   * a token named by a later `api/` release reaches neither this screen nor a catalogue key that
   * does not exist — the rule the directory page and `CareersHandoffService` already follow.
   * `caseAssignments` is the live case of that: it cannot reach this endpoint (a record whose case
   * read was refused is not served at all), and if it ever did, nothing here would render for it.
   *
   * <p>Scoped to {@link patientId}, not to the caller: it is a fact about this read of this record.
   */
  restricted(part: RecordRestrictedPart): boolean {
    return this.repository.recordRestrictions(this.patientId).includes(part);
  }

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
