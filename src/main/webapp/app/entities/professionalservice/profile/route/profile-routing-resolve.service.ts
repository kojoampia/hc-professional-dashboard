import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { EMPTY, Observable, catchError, of } from 'rxjs';

import { IProfile } from '../profile.model';
import { ProfileService } from '../service/profile.service';

const profileResolve = (route: ActivatedRouteSnapshot): Observable<null | IProfile> => {
  const { id } = route.params;
  if (id) {
    const router = inject(Router);
    const service = inject(ProfileService);
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

export default profileResolve;
