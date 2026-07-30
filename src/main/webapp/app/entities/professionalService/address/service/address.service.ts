import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { DATE_FORMAT } from 'app/config/input.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IAddress, NewAddress } from '../address.model';

export type PartialUpdateAddress = Partial<IAddress> & Pick<IAddress, 'id'>;

type RestOf<T extends IAddress | NewAddress> = Omit<T, 'createdDate' | 'modifiedDate'> & {
  createdDate?: string | null;
  modifiedDate?: string | null;
};

export type RestAddress = RestOf<IAddress>;

export type NewRestAddress = RestOf<NewAddress>;

export type PartialUpdateRestAddress = RestOf<PartialUpdateAddress>;

@Injectable()
export class AddressesService {
  readonly addressesParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly addressesResource = httpResource<RestAddress[]>(() => {
    const params = this.addressesParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of address that have been fetched. It is updated when the addressesResource emits a new value.
   * In case of error while fetching the addresses, the signal is set to an empty array.
   */
  readonly addresses = computed(() =>
    (this.addressesResource.hasValue() ? this.addressesResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/addresses');

  protected convertValueFromServer(restAddress: RestAddress): IAddress {
    return {
      ...restAddress,
      createdDate: restAddress.createdDate ? dayjs(restAddress.createdDate) : undefined,
      modifiedDate: restAddress.modifiedDate ? dayjs(restAddress.modifiedDate) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class AddressService extends AddressesService {
  protected readonly http = inject(HttpClient);

  create(address: NewAddress): Observable<IAddress> {
    const copy = this.convertValueFromClient(address);
    return this.http.post<RestAddress>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(address: IAddress): Observable<IAddress> {
    const copy = this.convertValueFromClient(address);
    return this.http
      .put<RestAddress>(`${this.resourceUrl}/${encodeURIComponent(this.getAddressIdentifier(address))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(address: PartialUpdateAddress): Observable<IAddress> {
    const copy = this.convertValueFromClient(address);
    return this.http
      .patch<RestAddress>(`${this.resourceUrl}/${encodeURIComponent(this.getAddressIdentifier(address))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IAddress> {
    return this.http
      .get<RestAddress>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IAddress[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestAddress[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getAddressIdentifier(address: Pick<IAddress, 'id'>): string {
    return address.id;
  }

  compareAddress(o1: Pick<IAddress, 'id'> | null, o2: Pick<IAddress, 'id'> | null): boolean {
    return o1 && o2 ? this.getAddressIdentifier(o1) === this.getAddressIdentifier(o2) : o1 === o2;
  }

  addAddressToCollectionIfMissing<Type extends Pick<IAddress, 'id'>>(
    addressCollection: Type[],
    ...addressesToCheck: (Type | null | undefined)[]
  ): Type[] {
    const addresses: Type[] = addressesToCheck.filter(isPresent);
    if (addresses.length > 0) {
      const addressCollectionIdentifiers = addressCollection.map(addressItem => this.getAddressIdentifier(addressItem));
      const addressesToAdd = addresses.filter(addressItem => {
        const addressIdentifier = this.getAddressIdentifier(addressItem);
        if (addressCollectionIdentifiers.includes(addressIdentifier)) {
          return false;
        }
        addressCollectionIdentifiers.push(addressIdentifier);
        return true;
      });
      return [...addressesToAdd, ...addressCollection];
    }
    return addressCollection;
  }

  protected convertValueFromClient<T extends IAddress | NewAddress | PartialUpdateAddress>(address: T): RestOf<T> {
    return {
      ...address,
      createdDate: address.createdDate?.format(DATE_FORMAT) ?? null,
      modifiedDate: address.modifiedDate?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertResponseFromServer(res: RestAddress): IAddress {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestAddress[]): IAddress[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
