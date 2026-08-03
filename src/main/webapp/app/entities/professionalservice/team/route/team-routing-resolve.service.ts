import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { EMPTY, Observable, catchError, of } from 'rxjs';

import { TeamService } from '../service/team.service';
import { ITeam } from '../team.model';

const teamResolve = (route: ActivatedRouteSnapshot): Observable<null | ITeam> => {
  const { id } = route.params;
  if (id) {
    const router = inject(Router);
    const service = inject(TeamService);
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

export default teamResolve;
