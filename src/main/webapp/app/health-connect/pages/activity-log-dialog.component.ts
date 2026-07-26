import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { AlertService } from 'app/core/util/alert.service';
import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';

@Component({
  standalone: true,
  selector: 'hpd-activity-log-dialog',
  imports: [ReactiveFormsModule, TranslateModule],
  template: `
    <section class="hpd-activity-dialog fixed inset-0 z-[1050] grid place-items-center bg-black/50 p-4" (click)="closeFromBackdrop($event)">
      <form
        #dialog
        [formGroup]="form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hpd-activity-dialog-title"
        aria-describedby="hpd-activity-dialog-description"
        class="grid w-full max-w-lg gap-4 rounded-hpd-lg bg-white p-6 text-hpd-primary-dark shadow-2xl"
        (keydown.escape)="close()"
        (keydown.tab)="trapFocus($event)"
        (ngSubmit)="save()"
      >
        <h2 id="hpd-activity-dialog-title" class="text-lg font-bold">{{ 'healthConnect.activity.title' | translate }}</h2>
        <p id="hpd-activity-dialog-description" class="sr-only">{{ 'healthConnect.activity.description' | translate }}</p>
        <label for="hpd-activity-title" class="grid gap-1 text-sm font-medium text-hpd-primary-dark"
          >{{ 'healthConnect.activity.eventTitle' | translate
          }}<input
            #firstInput
            id="hpd-activity-title"
            class="hpd-focusable rounded-hpd-sm border border-hpd-border px-3 py-2 text-sm font-normal shadow-hpd-sm"
            formControlName="title"
            [attr.aria-invalid]="submitted && form.controls.title.invalid"
          />
        </label>
        <label for="hpd-activity-description" class="grid gap-1 text-sm font-medium text-hpd-primary-dark"
          >{{ 'healthConnect.activity.description' | translate
          }}<textarea
            id="hpd-activity-description"
            class="hpd-focusable h-28 resize-none rounded-hpd-sm border border-hpd-border px-3 py-2 text-sm font-normal shadow-hpd-sm"
            formControlName="description"
            [attr.aria-invalid]="submitted && form.controls.description.invalid"
          ></textarea>
        </label>
        @if (form.invalid && submitted) {
          <p class="text-sm text-hpd-danger" role="alert">{{ 'healthConnect.validation.required' | translate }}</p>
        }
        <div class="hpd-activity-dialog__actions flex flex-wrap justify-end gap-2">
          <button
            class="hpd-focusable cursor-pointer rounded-hpd-sm border-[1.5px] border-hpd-border bg-white px-4 py-2 text-sm font-bold text-hpd-primary-dark hover:border-hpd-primary"
            type="button"
            (click)="close()"
          >
            {{ 'healthConnect.actions.cancel' | translate }}
          </button>
          <button
            class="hpd-focusable cursor-pointer rounded-hpd-sm bg-hpd-gold px-4 py-2 text-sm font-bold text-[#3a2a08] shadow-hpd-sm hover:bg-hpd-gold-bright"
            type="submit"
          >
            {{ 'healthConnect.actions.save' | translate }}
          </button>
        </div>
      </form>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ActivityLogDialogComponent implements AfterViewInit, OnDestroy {
  @ViewChild('dialog') dialog?: ElementRef<HTMLElement>;
  @ViewChild('firstInput') firstInput?: ElementRef<HTMLInputElement>;
  @Input({ required: true }) patientId!: string;
  @Output() readonly closed = new EventEmitter<void>();
  readonly repository = inject(HEALTH_CONNECT_REPOSITORY);
  private readonly alertService = inject(AlertService);
  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: Validators.required }),
    description: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });
  submitted = false;
  private activeElement: HTMLElement | null = null;

  ngAfterViewInit(): void {
    this.activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.firstInput?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    this.activeElement?.focus();
  }

  save(): void {
    this.submitted = true;
    if (this.form.invalid) {
      return;
    }
    const timestamp = new Date().toISOString();
    this.repository.appendActivity(this.patientId, { ...this.form.getRawValue(), createdAt: timestamp });
    this.alertService.showToast('healthConnect.toast.activityLogged');
    this.close();
  }

  close(): void {
    this.closed.emit();
  }

  closeFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  trapFocus(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    const focusable = Array.from(
      this.dialog?.nativeElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
