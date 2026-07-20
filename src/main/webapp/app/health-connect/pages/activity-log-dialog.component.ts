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
    <section class="hpd-activity-dialog" (click)="closeFromBackdrop($event)">
      <form
        #dialog
        [formGroup]="form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hpd-activity-dialog-title"
        aria-describedby="hpd-activity-dialog-description"
        (keydown.escape)="close()"
        (keydown.tab)="trapFocus($event)"
        (ngSubmit)="save()"
      >
        <h2 id="hpd-activity-dialog-title">{{ 'healthConnect.activity.title' | translate }}</h2>
        <p id="hpd-activity-dialog-description" class="visually-hidden">{{ 'healthConnect.activity.description' | translate }}</p>
        <label for="hpd-activity-title"
          >{{ 'healthConnect.activity.eventTitle' | translate
          }}<input
            #firstInput
            id="hpd-activity-title"
            class="form-control hpd-focusable"
            formControlName="title"
            [attr.aria-invalid]="submitted && form.controls.title.invalid"
          />
        </label>
        <label for="hpd-activity-description"
          >{{ 'healthConnect.activity.description' | translate
          }}<textarea
            id="hpd-activity-description"
            class="form-control hpd-focusable"
            formControlName="description"
            [attr.aria-invalid]="submitted && form.controls.description.invalid"
          ></textarea>
        </label>
        @if (form.invalid && submitted) {
          <p class="text-danger" role="alert">{{ 'healthConnect.validation.required' | translate }}</p>
        }
        <div class="hpd-activity-dialog__actions">
          <button class="hpd-focusable btn btn-primary" type="submit">{{ 'healthConnect.actions.save' | translate }}</button>
          <button class="hpd-focusable btn btn-outline-secondary" type="button" (click)="close()">
            {{ 'healthConnect.actions.cancel' | translate }}
          </button>
        </div>
      </form>
    </section>
  `,
  styles: `
    .hpd-activity-dialog { position:fixed; z-index:1050; inset:0; display:grid; place-items:center; padding:1rem; background:rgb(0 0 0 / .5); }
    form { width:min(100%, 32rem); display:grid; gap:1rem; padding:1.5rem; background:var(--hpd-color-surface); color:var(--hpd-color-text-primary); }
    .hpd-activity-dialog__actions { display:flex; flex-wrap:wrap; gap:.5rem; }
    @media (max-width:375px) { .hpd-activity-dialog { padding:.5rem; } form { padding:1rem; } .hpd-activity-dialog__actions > button { flex:1 1 100%; } }
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
