import { Component, OnDestroy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Alert, AlertService, AlertType } from 'app/core/util/alert.service';
import { EventManager, EventWithContent } from 'app/core/util/event-manager.service';
import { AlertError } from './alert-error.model';

const ALERT_TYPE_CLASSES: Record<AlertType, string> = {
  success: 'border-hpd-success-accent/25 bg-hpd-success-tint text-hpd-success',
  danger: 'border-hpd-danger/25 bg-hpd-danger-tint text-hpd-danger',
  warning: 'border-hpd-warning-accent/25 bg-hpd-warning-tint text-hpd-warning',
  info: 'border-hpd-primary/20 bg-[#e7eef6] text-hpd-primary',
};

@Component({
  selector: 'hpd-alert-error',
  templateUrl: './alert-error.component.html',
  imports: [CommonModule, MatIconModule, TranslateModule],
})
export class AlertErrorComponent implements OnDestroy {
  alerts: Alert[] = [];
  errorListener: Subscription;
  httpErrorListener: Subscription;

  constructor(
    private alertService: AlertService,
    private eventManager: EventManager,
    translateService: TranslateService,
  ) {
    this.errorListener = eventManager.subscribe('professionalGatewayApp.error', (response: EventWithContent<unknown> | string) => {
      const errorResponse = (response as EventWithContent<AlertError>).content;
      this.addErrorAlert(errorResponse.message, errorResponse.key, errorResponse.params);
    });

    this.httpErrorListener = eventManager.subscribe('professionalGatewayApp.httpError', (response: EventWithContent<unknown> | string) => {
      const httpErrorResponse = (response as EventWithContent<HttpErrorResponse>).content;
      switch (httpErrorResponse.status) {
        // connection refused, server not reachable
        case 0:
          // The message argument is the fallback `addAlert` uses when the key is missing. The key is
          // present in all four catalogues — as the flat `"server.not.reachable"` entry in
          // `global.json`, not in `error.json`, which is easy to miss — so this is belt and braces
          // rather than the visible string. It is resolved rather than hardcoded so that if the key
          // is ever dropped the fallback degrades to the user's language, not to English.
          this.addErrorAlert(translateService.instant('error.server.not.reachable'), 'error.server.not.reachable');
          break;

        case 400: {
          const arr = httpErrorResponse.headers.keys();
          let errorHeader: string | null = null;
          let entityKey: string | null = null;
          for (const entry of arr) {
            if (entry.toLowerCase().endsWith('app-error')) {
              errorHeader = httpErrorResponse.headers.get(entry);
            } else if (entry.toLowerCase().endsWith('app-params')) {
              entityKey = httpErrorResponse.headers.get(entry);
            }
          }
          if (errorHeader) {
            const alertData = entityKey ? { entityName: translateService.instant(`global.menu.entities.${entityKey}`) } : undefined;
            this.addErrorAlert(errorHeader, errorHeader, alertData);
          } else if (httpErrorResponse.error !== '' && httpErrorResponse.error.fieldErrors) {
            const fieldErrors = httpErrorResponse.error.fieldErrors;
            for (const fieldError of fieldErrors) {
              if (['Min', 'Max', 'DecimalMin', 'DecimalMax'].includes(fieldError.message)) {
                fieldError.message = 'Size';
              }
              // convert 'something[14].other[4].id' to 'something[].other[].id' so translations can be written to it
              const convertedField: string = fieldError.field.replace(/\[\d*\]/g, '[]');
              const fieldName: string = translateService.instant(
                `professionalGatewayApp.${fieldError.objectName as string}.${convertedField}`,
              );
              // `error.<constraint>` is a Bean Validation constraint name. Only `Size` and `NotNull`
              // are in the catalogues, and the switch above folds Min/Max/DecimalMin/DecimalMax into
              // `Size` — so any other constraint (`Pattern`, `Email`, …) misses and this fallback is
              // what the user reads. `error.fieldError` was added for it; it used to be interpolated
              // in English here, which meant a French user got an English sentence around a French
              // field name.
              this.addErrorAlert(translateService.instant('error.fieldError', { fieldName }), `error.${fieldError.message as string}`, {
                fieldName,
              });
            }
          } else if (httpErrorResponse.error !== '' && httpErrorResponse.error.message) {
            this.addErrorAlert(
              httpErrorResponse.error.detail ?? httpErrorResponse.error.message,
              httpErrorResponse.error.message,
              httpErrorResponse.error.params,
            );
          } else {
            this.addErrorAlert(httpErrorResponse.error, httpErrorResponse.error);
          }
          break;
        }

        case 404:
          this.addErrorAlert(translateService.instant('error.url.not.found'), 'error.url.not.found');
          break;

        default:
          if (httpErrorResponse.error !== '' && httpErrorResponse.error.message) {
            this.addErrorAlert(
              httpErrorResponse.error.detail ?? httpErrorResponse.error.message,
              httpErrorResponse.error.message,
              httpErrorResponse.error.params,
            );
          } else {
            this.addErrorAlert(httpErrorResponse.error, httpErrorResponse.error);
          }
      }
    });
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
    this.eventManager.destroy(this.errorListener);
    this.eventManager.destroy(this.httpErrorListener);
  }

  close(alert: Alert): void {
    alert.close?.(this.alerts);
  }

  private addErrorAlert(message?: string, translationKey?: string, translationParams?: { [key: string]: unknown }): void {
    this.alertService.addAlert({ type: 'danger', message, translationKey, translationParams }, this.alerts);
  }
}
