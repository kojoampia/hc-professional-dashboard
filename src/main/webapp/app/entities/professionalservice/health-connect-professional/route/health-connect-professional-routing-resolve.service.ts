import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { EMPTY, Observable, catchError, of } from 'rxjs';

import { IHealthConnectProfessional } from '../health-connect-professional.model';
import { HealthConnectProfessionalService } from '../service/health-connect-professional.service';

const healthConnectProfessionalResolve = (route: ActivatedRouteSnapshot): Observable<null | IHealthConnectProfessional> => {
  const { id } = route.params;
  if (id) {
    const router = inject(Router);
    const service = inject(HealthConnectProfessionalService);
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

export default healthConnectProfessionalResolve;
