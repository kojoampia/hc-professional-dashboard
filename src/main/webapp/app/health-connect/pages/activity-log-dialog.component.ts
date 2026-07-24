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
        class="grid w-full max-w-lg gap-4 rounded-2xl bg-white p-6 text-slate-900 shadow-2xl"
        (keydown.escape)="close()"
        (keydown.tab)="trapFocus($event)"
        (ngSubmit)="save()"
      >
        <h2 id="hpd-activity-dialog-title" class="text-lg font-bold">{{ 'healthConnect.activity.title' | translate }}</h2>
        <p id="hpd-activity-dialog-description" class="sr-only">{{ 'healthConnect.activity.description' | translate }}</p>
        <label for="hpd-activity-title" class="grid gap-1 text-sm font-medium text-slate-700"
          >{{ 'healthConnect.activity.eventTitle' | translate
          }}<input
            #firstInput
            id="hpd-activity-title"
            class="hpd-focusable rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal shadow-sm"
            formControlName="title"
            [attr.aria-invalid]="submitted && form.controls.title.invalid"
          />
        </label>
        <label for="hpd-activity-description" class="grid gap-1 text-sm font-medium text-slate-700"
          >{{ 'healthConnect.activity.description' | translate
          }}<textarea
            id="hpd-activity-description"
            class="hpd-focusable h-28 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal shadow-sm"
            formControlName="description"
            [attr.aria-invalid]="submitted && form.controls.description.invalid"
          ></textarea>
        </label>
        @if (form.invalid && submitted) {
          <p class="text-sm text-rose-600" role="alert">{{ 'healthConnect.validation.required' | translate }}</p>
        }
        <div class="hpd-activity-dialog__actions flex flex-wrap justify-end gap-2">
          <button
            class="hpd-focusable rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            type="button"
            (click)="close()"
          >
            {{ 'healthConnect.actions.cancel' | translate }}
          </button>
          <button
            class="hpd-focusable rounded-full bg-hpd-primary px-4 py-2 text-sm font-medium text-white hover:brightness-110"
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
