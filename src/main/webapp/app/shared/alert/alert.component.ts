import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { Alert, AlertService, AlertType } from 'app/core/util/alert.service';

const ALERT_TYPE_CLASSES: Record<AlertType, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  danger: 'border-rose-200 bg-rose-50 text-rose-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-indigo-200 bg-indigo-50 text-indigo-800',
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
