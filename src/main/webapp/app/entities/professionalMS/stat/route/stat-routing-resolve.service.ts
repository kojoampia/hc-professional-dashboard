import { inject } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { of, EMPTY, Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { IStat } from '../stat.model';
import { StatService } from '../service/stat.service';

export const statResolve = (route: ActivatedRouteSnapshot): Observable<null | IStat> => {
  const id = route.params['id'];
  if (id) {
    return inject(StatService)
      .find(id)
      .pipe(
        mergeMap((stat: HttpResponse<IStat>) => {
          if (stat.body) {
            return of(stat.body);
          } else {
            inject(Router).navigate(['404']);
            return EMPTY;
          }
        }),
      );
  }
  return of(null);
};

export default statResolve;
