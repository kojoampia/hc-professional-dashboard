import { inject } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { of, EMPTY, Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { IProfile } from '../profile.model';
import { ProfileService } from '../service/profile.service';

export const profileResolve = (route: ActivatedRouteSnapshot): Observable<null | IProfile> => {
  const id = route.params['id'];
  if (id) {
    return inject(ProfileService)
      .find(id)
      .pipe(
        mergeMap((profile: HttpResponse<IProfile>) => {
          if (profile.body) {
            return of(profile.body);
          } else {
            inject(Router).navigate(['404']);
            return EMPTY;
          }
        }),
      );
  }
  return of(null);
};

export default profileResolve;
