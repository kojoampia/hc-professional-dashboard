import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { EMPTY, Observable, catchError, of } from 'rxjs';

import { IDutyRoster } from '../duty-roster.model';
import { DutyRosterService } from '../service/duty-roster.service';

const dutyRosterResolve = (route: ActivatedRouteSnapshot): Observable<null | IDutyRoster> => {
  const { id } = route.params;
  if (id) {
    const router = inject(Router);
    const service = inject(DutyRosterService);
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

export default dutyRosterResolve;
