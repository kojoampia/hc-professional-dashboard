import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { Alert, AlertService } from 'app/core/util/alert.service';

/**
 * BridgeCare toast outlet (demo #toast): fixed bottom-center navy pill with a
 * check icon. Renders only `toast` alerts; banner alerts stay with
 * `hpd-alert` / `hpd-alert-error`. Mounted once in the main layout so toasts
 * work on every page.
 */
@Component({
  standalone: true,
  selector: 'hpd-toast-outlet',
  imports: [MatIconModule],
  template: `
    <div class="pointer-events-none fixed inset-x-0 bottom-6 z-[1100] flex flex-col items-center gap-2 max-lg:bottom-20" role="status">
      @for (alert of toasts; track alert.id) {
        @if (alert.message) {
          <button
            class="hpd-focusable pointer-events-auto flex items-center gap-2 rounded-full bg-hpd-primary px-4.5 py-2.5 text-[13.5px] font-semibold text-white shadow-hpd-lg"
            type="button"
            (click)="dismiss(alert)"
          >
            <mat-icon aria-hidden="true" class="!h-[17px] !w-[17px] !text-[17px] text-hpd-gold-bright">check</mat-icon>
            <span [innerHTML]="alert.message"></span>
          </button>
        }
      }
    </div>
  `,
})
export default class ToastOutletComponent implements OnInit {
  private alerts: Alert[] = [];

  constructor(private alertService: AlertService) {}

  ngOnInit(): void {
    this.alerts = this.alertService.get();
  }

  get toasts(): Alert[] {
    return this.alerts.filter(alert => alert.toast);
  }

  dismiss(alert: Alert): void {
    alert.close?.(this.alerts);
  }
}
