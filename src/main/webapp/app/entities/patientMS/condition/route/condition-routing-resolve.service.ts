import { inject } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { of, EMPTY, Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { ICondition } from '../condition.model';
import { ConditionService } from '../service/condition.service';

export const conditionResolve = (route: ActivatedRouteSnapshot): Observable<null | ICondition> => {
  const id = route.params['id'];
  if (id) {
    return inject(ConditionService)
      .find(id)
      .pipe(
        mergeMap((condition: HttpResponse<ICondition>) => {
          if (condition.body) {
            return of(condition.body);
          } else {
            inject(Router).navigate(['404']);
            return EMPTY;
          }
        }),
      );
  }
  return of(null);
};

export default conditionResolve;
