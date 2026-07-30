import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { DATE_FORMAT } from 'app/config/input.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IProfile, NewProfile } from '../profile.model';

export type PartialUpdateProfile = Partial<IProfile> & Pick<IProfile, 'id'>;

type RestOf<T extends IProfile | NewProfile> = Omit<T, 'birthDate'> & {
  birthDate?: string | null;
};

export type RestProfile = RestOf<IProfile>;

export type NewRestProfile = RestOf<NewProfile>;

export type PartialUpdateRestProfile = RestOf<PartialUpdateProfile>;

@Injectable()
export class ProfilesService {
  readonly profilesParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly profilesResource = httpResource<RestProfile[]>(() => {
    const params = this.profilesParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of profile that have been fetched. It is updated when the profilesResource emits a new value.
   * In case of error while fetching the profiles, the signal is set to an empty array.
   */
  readonly profiles = computed(() =>
    (this.profilesResource.hasValue() ? this.profilesResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/profiles');

  protected convertValueFromServer(restProfile: RestProfile): IProfile {
    return {
      ...restProfile,
      birthDate: restProfile.birthDate ? dayjs(restProfile.birthDate) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class ProfileService extends ProfilesService {
  protected readonly http = inject(HttpClient);

  create(profile: NewProfile): Observable<IProfile> {
    const copy = this.convertValueFromClient(profile);
    return this.http.post<RestProfile>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(profile: IProfile): Observable<IProfile> {
    const copy = this.convertValueFromClient(profile);
    return this.http
      .put<RestProfile>(`${this.resourceUrl}/${encodeURIComponent(this.getProfileIdentifier(profile))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(profile: PartialUpdateProfile): Observable<IProfile> {
    const copy = this.convertValueFromClient(profile);
    return this.http
      .patch<RestProfile>(`${this.resourceUrl}/${encodeURIComponent(this.getProfileIdentifier(profile))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IProfile> {
    return this.http
      .get<RestProfile>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IProfile[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestProfile[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
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
      const profileCollectionIdentifiers = profileCollection.map(profileItem => this.getProfileIdentifier(profileItem));
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

  protected convertValueFromClient<T extends IProfile | NewProfile | PartialUpdateProfile>(profile: T): RestOf<T> {
    return {
      ...profile,
      birthDate: profile.birthDate?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertResponseFromServer(res: RestProfile): IProfile {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestProfile[]): IProfile[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
