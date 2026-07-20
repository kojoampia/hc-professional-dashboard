import { inject } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { of, EMPTY, Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { IAddress } from '../address.model';
import { AddressService } from '../service/address.service';

export const addressResolve = (route: ActivatedRouteSnapshot): Observable<null | IAddress> => {
  const id = route.params['id'];
  if (id) {
    return inject(AddressService)
      .find(id)
      .pipe(
        mergeMap((address: HttpResponse<IAddress>) => {
          if (address.body) {
            return of(address.body);
          } else {
            inject(Router).navigate(['404']);
            return EMPTY;
          }
        }),
      );
  }
  return of(null);
};

export default addressResolve;
