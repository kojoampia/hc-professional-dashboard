import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, asapScheduler, scheduled } from 'rxjs';

import { catchError } from 'rxjs/operators';

import { isPresent } from 'app/core/util/operators';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { Search } from 'app/core/request/request.model';
import { IHCPayOption, NewHCPayOption } from '../hc-pay-option.model';

export type PartialUpdateHCPayOption = Partial<IHCPayOption> & Pick<IHCPayOption, 'id'>;

export type EntityResponseType = HttpResponse<IHCPayOption>;
export type EntityArrayResponseType = HttpResponse<IHCPayOption[]>;

@Injectable({ providedIn: 'root' })
export class HCPayOptionService {
  protected resourceUrl = this.applicationConfigService.getEndpointFor('api/hc-pay-options');
  protected resourceSearchUrl = this.applicationConfigService.getEndpointFor('api/hc-pay-options/_search');

  constructor(
    protected http: HttpClient,
    protected applicationConfigService: ApplicationConfigService,
  ) {}

  create(hCPayOption: NewHCPayOption): Observable<EntityResponseType> {
    return this.http.post<IHCPayOption>(this.resourceUrl, hCPayOption, { observe: 'response' });
  }

  update(hCPayOption: IHCPayOption): Observable<EntityResponseType> {
    return this.http.put<IHCPayOption>(`${this.resourceUrl}/${this.getHCPayOptionIdentifier(hCPayOption)}`, hCPayOption, {
      observe: 'response',
    });
  }

  partialUpdate(hCPayOption: PartialUpdateHCPayOption): Observable<EntityResponseType> {
    return this.http.patch<IHCPayOption>(`${this.resourceUrl}/${this.getHCPayOptionIdentifier(hCPayOption)}`, hCPayOption, {
      observe: 'response',
    });
  }

  find(id: string): Observable<EntityResponseType> {
    return this.http.get<IHCPayOption>(`${this.resourceUrl}/${id}`, { observe: 'response' });
  }

  query(req?: any): Observable<EntityArrayResponseType> {
    const options = createRequestOption(req);
    return this.http.get<IHCPayOption[]>(this.resourceUrl, { params: options, observe: 'response' });
  }

  delete(id: string): Observable<HttpResponse<{}>> {
    return this.http.delete(`${this.resourceUrl}/${id}`, { observe: 'response' });
  }

  search(req: Search): Observable<EntityArrayResponseType> {
    const options = createRequestOption(req);
    return this.http
      .get<IHCPayOption[]>(this.resourceSearchUrl, { params: options, observe: 'response' })
      .pipe(catchError(() => scheduled([new HttpResponse<IHCPayOption[]>()], asapScheduler)));
  }

  getHCPayOptionIdentifier(hCPayOption: Pick<IHCPayOption, 'id'>): string {
    return hCPayOption.id;
  }

  compareHCPayOption(o1: Pick<IHCPayOption, 'id'> | null, o2: Pick<IHCPayOption, 'id'> | null): boolean {
    return o1 && o2 ? this.getHCPayOptionIdentifier(o1) === this.getHCPayOptionIdentifier(o2) : o1 === o2;
  }

  addHCPayOptionToCollectionIfMissing<Type extends Pick<IHCPayOption, 'id'>>(
    hCPayOptionCollection: Type[],
    ...hCPayOptionsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const hCPayOptions: Type[] = hCPayOptionsToCheck.filter(isPresent);
    if (hCPayOptions.length > 0) {
      const hCPayOptionCollectionIdentifiers = hCPayOptionCollection.map(
        hCPayOptionItem => this.getHCPayOptionIdentifier(hCPayOptionItem)!,
      );
      const hCPayOptionsToAdd = hCPayOptions.filter(hCPayOptionItem => {
        const hCPayOptionIdentifier = this.getHCPayOptionIdentifier(hCPayOptionItem);
        if (hCPayOptionCollectionIdentifiers.includes(hCPayOptionIdentifier)) {
          return false;
        }
        hCPayOptionCollectionIdentifiers.push(hCPayOptionIdentifier);
        return true;
      });
      return [...hCPayOptionsToAdd, ...hCPayOptionCollection];
    }
    return hCPayOptionCollection;
  }
}
