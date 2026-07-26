import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { Alert, AlertService, AlertType } from 'app/core/util/alert.service';

const ALERT_TYPE_CLASSES: Record<AlertType, string> = {
  success: 'border-hpd-success-accent/25 bg-hpd-success-tint text-hpd-success',
  danger: 'border-hpd-danger/25 bg-hpd-danger-tint text-hpd-danger',
  warning: 'border-hpd-warning-accent/25 bg-hpd-warning-tint text-hpd-warning',
  info: 'border-hpd-primary/20 bg-[#e7eef6] text-hpd-primary',
};

@Component({
  selector: 'hpd-alert',
  templateUrl: './alert.component.html',
  imports: [CommonModule, MatIconModule, TranslateModule],
})
export class AlertComponent implements OnInit, OnDestroy {
  alerts: Alert[] = [];

  constructor(private alertService: AlertService) {}

  ngOnInit(): void {
    this.alerts = this.alertService.get();
  }

  /** Toast alerts render in the global hpd-toast-outlet, not the banner region. */
  get bannerAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.toast);
  }

  setClasses(alert: Alert): { [key: string]: boolean } {
    const classes = { 'hpd-toast': Boolean(alert.toast) };
    if (alert.position) {
      return { ...classes, [alert.position]: true };
    }
    return classes;
  }

  alertTypeClasses(type: AlertType): string {
    return ALERT_TYPE_CLASSES[type];
  }

  ngOnDestroy(): void {
    this.alertService.clear();
  }

  close(alert: Alert): void {
    alert.close?.(this.alerts);
  }
}
