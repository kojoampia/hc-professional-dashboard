import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { EMPTY, Observable, catchError, of } from 'rxjs';

import { IActivityLogEntry } from '../activity-log-entry.model';
import { ActivityLogEntryService } from '../service/activity-log-entry.service';

const activityLogEntryResolve = (route: ActivatedRouteSnapshot): Observable<null | IActivityLogEntry> => {
  const { id } = route.params;
  if (id) {
    const router = inject(Router);
    const service = inject(ActivityLogEntryService);
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

export default activityLogEntryResolve;
