import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IVisitation, NewVisitation } from '../visitation.model';

export type PartialUpdateVisitation = Partial<IVisitation> & Pick<IVisitation, 'id'>;

type RestOf<T extends IVisitation | NewVisitation> = Omit<T, 'occurredAt'> & {
  occurredAt?: string | null;
};

export type RestVisitation = RestOf<IVisitation>;

export type NewRestVisitation = RestOf<NewVisitation>;

export type PartialUpdateRestVisitation = RestOf<PartialUpdateVisitation>;

@Injectable()
export class VisitationsService {
  readonly visitationsParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly visitationsResource = httpResource<RestVisitation[]>(() => {
    const params = this.visitationsParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of visitation that have been fetched. It is updated when the visitationsResource emits a new value.
   * In case of error while fetching the visitations, the signal is set to an empty array.
   */
  readonly visitations = computed(() =>
    (this.visitationsResource.hasValue() ? this.visitationsResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/visitations', 'patientservice');

  protected convertValueFromServer(restVisitation: RestVisitation): IVisitation {
    return {
      ...restVisitation,
      occurredAt: restVisitation.occurredAt ? dayjs(restVisitation.occurredAt) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class VisitationService extends VisitationsService {
  protected readonly http = inject(HttpClient);

  create(visitation: NewVisitation): Observable<IVisitation> {
    const copy = this.convertValueFromClient(visitation);
    return this.http.post<RestVisitation>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(visitation: IVisitation): Observable<IVisitation> {
    const copy = this.convertValueFromClient(visitation);
    return this.http
      .put<RestVisitation>(`${this.resourceUrl}/${encodeURIComponent(this.getVisitationIdentifier(visitation))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(visitation: PartialUpdateVisitation): Observable<IVisitation> {
    const copy = this.convertValueFromClient(visitation);
    return this.http
      .patch<RestVisitation>(`${this.resourceUrl}/${encodeURIComponent(this.getVisitationIdentifier(visitation))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IVisitation> {
    return this.http
      .get<RestVisitation>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IVisitation[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestVisitation[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getVisitationIdentifier(visitation: Pick<IVisitation, 'id'>): string {
    return visitation.id;
  }

  compareVisitation(o1: Pick<IVisitation, 'id'> | null, o2: Pick<IVisitation, 'id'> | null): boolean {
    return o1 && o2 ? this.getVisitationIdentifier(o1) === this.getVisitationIdentifier(o2) : o1 === o2;
  }

  addVisitationToCollectionIfMissing<Type extends Pick<IVisitation, 'id'>>(
    visitationCollection: Type[],
    ...visitationsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const visitations: Type[] = visitationsToCheck.filter(isPresent);
    if (visitations.length > 0) {
      const visitationCollectionIdentifiers = visitationCollection.map(visitationItem => this.getVisitationIdentifier(visitationItem));
      const visitationsToAdd = visitations.filter(visitationItem => {
        const visitationIdentifier = this.getVisitationIdentifier(visitationItem);
        if (visitationCollectionIdentifiers.includes(visitationIdentifier)) {
          return false;
        }
        visitationCollectionIdentifiers.push(visitationIdentifier);
        return true;
      });
      return [...visitationsToAdd, ...visitationCollection];
    }
    return visitationCollection;
  }

  protected convertValueFromClient<T extends IVisitation | NewVisitation | PartialUpdateVisitation>(visitation: T): RestOf<T> {
    return {
      ...visitation,
      occurredAt: visitation.occurredAt?.toJSON() ?? null,
    };
  }

  protected convertResponseFromServer(res: RestVisitation): IVisitation {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestVisitation[]): IVisitation[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
