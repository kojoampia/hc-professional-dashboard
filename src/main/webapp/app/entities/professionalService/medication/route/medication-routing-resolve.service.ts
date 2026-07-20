import { inject } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { of, EMPTY, Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { IMedication } from '../medication.model';
import { MedicationService } from '../service/medication.service';

export const medicationResolve = (route: ActivatedRouteSnapshot): Observable<null | IMedication> => {
  const id = route.params['id'];
  if (id) {
    return inject(MedicationService)
      .find(id)
      .pipe(
        mergeMap((medication: HttpResponse<IMedication>) => {
          if (medication.body) {
            return of(medication.body);
          } else {
            inject(Router).navigate(['404']);
            return EMPTY;
          }
        }),
      );
  }
  return of(null);
};

export default medicationResolve;
