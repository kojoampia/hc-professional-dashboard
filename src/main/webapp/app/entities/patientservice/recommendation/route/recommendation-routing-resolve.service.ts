import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { EMPTY, Observable, catchError, of } from 'rxjs';

import { IRecommendation } from '../recommendation.model';
import { RecommendationService } from '../service/recommendation.service';

const recommendationResolve = (route: ActivatedRouteSnapshot): Observable<null | IRecommendation> => {
  const { id } = route.params;
  if (id) {
    const router = inject(Router);
    const service = inject(RecommendationService);
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

export default recommendationResolve;
