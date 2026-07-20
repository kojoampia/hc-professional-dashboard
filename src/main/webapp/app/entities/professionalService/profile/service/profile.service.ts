import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, asapScheduler, scheduled } from 'rxjs';

import { catchError, map } from 'rxjs/operators';

import dayjs from 'dayjs/esm';

import { isPresent } from 'app/core/util/operators';
import { DATE_FORMAT } from 'app/config/input.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { SearchWithPagination } from 'app/core/request/request.model';
import { IProfile, NewProfile } from '../profile.model';

export type PartialUpdateProfile = Partial<IProfile> & Pick<IProfile, 'id'>;

type RestOf<T extends IProfile | NewProfile> = Omit<T, 'birthDate'> & {
  birthDate?: string | null;
};

export type RestProfile = RestOf<IProfile>;

export type NewRestProfile = RestOf<NewProfile>;

export type PartialUpdateRestProfile = RestOf<PartialUpdateProfile>;

export type EntityResponseType = HttpResponse<IProfile>;
export type EntityArrayResponseType = HttpResponse<IProfile[]>;

@Injectable({ providedIn: 'root' })
export class ProfileService {
  protected resourceUrl = this.applicationConfigService.getEndpointFor('api/profiles');
  protected resourceSearchUrl = this.applicationConfigService.getEndpointFor('api/profiles/_search');

  constructor(
    protected http: HttpClient,
    protected applicationConfigService: ApplicationConfigService,
  ) {}

  create(profile: NewProfile): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(profile);
    return this.http
      .post<RestProfile>(this.resourceUrl, copy, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(profile: IProfile): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(profile);
    return this.http
      .put<RestProfile>(`${this.resourceUrl}/${this.getProfileIdentifier(profile)}`, copy, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(profile: PartialUpdateProfile): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(profile);
    return this.http
      .patch<RestProfile>(`${this.resourceUrl}/${this.getProfileIdentifier(profile)}`, copy, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<EntityResponseType> {
    return this.http
      .get<RestProfile>(`${this.resourceUrl}/${id}`, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<EntityArrayResponseType> {
    const options = createRequestOption(req);
    return this.http
      .get<RestProfile[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => this.convertResponseArrayFromServer(res)));
  }

  delete(id: string): Observable<HttpResponse<{}>> {
    return this.http.delete(`${this.resourceUrl}/${id}`, { observe: 'response' });
  }

  search(req: SearchWithPagination): Observable<EntityArrayResponseType> {
    const options = createRequestOption(req);
    return this.http.get<RestProfile[]>(this.resourceSearchUrl, { params: options, observe: 'response' }).pipe(
      map(res => this.convertResponseArrayFromServer(res)),
      catchError(() => scheduled([new HttpResponse<IProfile[]>()], asapScheduler)),
    );
  }

  getProfileIdentifier(profile: Pick<IProfile, 'id'>): string {
    return profile.id;
  }

  compareProfile(o1: Pick<IProfile, 'id'> | null, o2: Pick<IProfile, 'id'> | null): boolean {
    return o1 && o2 ? this.getProfileIdentifier(o1) === this.getProfileIdentifier(o2) : o1 === o2;
  }

  addProfileToCollectionIfMissing<Type extends Pick<IProfile, 'id'>>(
    profileCollection: Type[],
    ...profilesToCheck: (Type | null | undefined)[]
  ): Type[] {
    const profiles: Type[] = profilesToCheck.filter(isPresent);
    if (profiles.length > 0) {
      const profileCollectionIdentifiers = profileCollection.map(profileItem => this.getProfileIdentifier(profileItem)!);
      const profilesToAdd = profiles.filter(profileItem => {
        const profileIdentifier = this.getProfileIdentifier(profileItem);
        if (profileCollectionIdentifiers.includes(profileIdentifier)) {
          return false;
        }
        profileCollectionIdentifiers.push(profileIdentifier);
        return true;
      });
      return [...profilesToAdd, ...profileCollection];
    }
    return profileCollection;
  }

  protected convertDateFromClient<T extends IProfile | NewProfile | PartialUpdateProfile>(profile: T): RestOf<T> {
    return {
      ...profile,
      birthDate: profile.birthDate?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertDateFromServer(restProfile: RestProfile): IProfile {
    return {
      ...restProfile,
      birthDate: restProfile.birthDate ? dayjs(restProfile.birthDate) : undefined,
    };
  }

  protected convertResponseFromServer(res: HttpResponse<RestProfile>): HttpResponse<IProfile> {
    return res.clone({
      body: res.body ? this.convertDateFromServer(res.body) : null,
    });
  }

  protected convertResponseArrayFromServer(res: HttpResponse<RestProfile[]>): HttpResponse<IProfile[]> {
    return res.clone({
      body: res.body ? res.body.map(item => this.convertDateFromServer(item)) : null,
    });
  }
}
