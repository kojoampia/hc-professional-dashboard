import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { EMPTY, Observable, catchError, of } from 'rxjs';

import { IClinicalReport } from '../clinical-report.model';
import { ClinicalReportService } from '../service/clinical-report.service';

const clinicalReportResolve = (route: ActivatedRouteSnapshot): Observable<null | IClinicalReport> => {
  const { id } = route.params;
  if (id) {
    const router = inject(Router);
    const service = inject(ClinicalReportService);
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

export default clinicalReportResolve;
