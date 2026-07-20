import { inject } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { of, EMPTY, Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { IHCCredential } from '../hc-credential.model';
import { HCCredentialService } from '../service/hc-credential.service';

export const hCCredentialResolve = (route: ActivatedRouteSnapshot): Observable<null | IHCCredential> => {
  const id = route.params['id'];
  if (id) {
    return inject(HCCredentialService)
      .find(id)
      .pipe(
        mergeMap((hCCredential: HttpResponse<IHCCredential>) => {
          if (hCCredential.body) {
            return of(hCCredential.body);
          } else {
            inject(Router).navigate(['404']);
            return EMPTY;
          }
        }),
      );
  }
  return of(null);
};

export default hCCredentialResolve;
