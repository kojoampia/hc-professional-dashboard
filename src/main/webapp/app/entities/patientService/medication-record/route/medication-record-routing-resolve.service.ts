import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { EMPTY, Observable, catchError, of } from 'rxjs';

import { IMedicationRecord } from '../medication-record.model';
import { MedicationRecordService } from '../service/medication-record.service';

const medicationRecordResolve = (route: ActivatedRouteSnapshot): Observable<null | IMedicationRecord> => {
  const { id } = route.params;
  if (id) {
    const router = inject(Router);
    const service = inject(MedicationRecordService);
    return service.find(id).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          router.navigate(['404']);
        } else {
          router.navigate(['error']);
        }
        return EMPTY;
      }),
    );
  }

  return of(null);
};

export default medicationRecordResolve;
