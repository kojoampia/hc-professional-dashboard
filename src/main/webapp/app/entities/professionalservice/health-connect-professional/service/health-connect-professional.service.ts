import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IHealthConnectProfessional, NewHealthConnectProfessional } from '../health-connect-professional.model';

export type PartialUpdateHealthConnectProfessional = Partial<IHealthConnectProfessional> & Pick<IHealthConnectProfessional, 'id'>;

@Injectable()
export class HealthConnectProfessionalsService {
  readonly healthConnectProfessionalsParams = signal<
    Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined
  >(undefined);
  readonly healthConnectProfessionalsResource = httpResource<IHealthConnectProfessional[]>(() => {
    const params = this.healthConnectProfessionalsParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of healthConnectProfessional that have been fetched. It is updated when the healthConnectProfessionalsResource emits a new value.
   * In case of error while fetching the healthConnectProfessionals, the signal is set to an empty array.
   */
  readonly healthConnectProfessionals = computed(() =>
    this.healthConnectProfessionalsResource.hasValue() ? this.healthConnectProfessionalsResource.value() : [],
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/health-connect-professionals', 'professionalservice');
}

@Injectable({ providedIn: 'root' })
export class HealthConnectProfessionalService extends HealthConnectProfessionalsService {
  protected readonly http = inject(HttpClient);

  create(healthConnectProfessional: NewHealthConnectProfessional): Observable<IHealthConnectProfessional> {
    return this.http.post<IHealthConnectProfessional>(this.resourceUrl, healthConnectProfessional);
  }

  update(healthConnectProfessional: IHealthConnectProfessional): Observable<IHealthConnectProfessional> {
    return this.http.put<IHealthConnectProfessional>(
      `${this.resourceUrl}/${encodeURIComponent(this.getHealthConnectProfessionalIdentifier(healthConnectProfessional))}`,
      healthConnectProfessional,
    );
  }

  partialUpdate(healthConnectProfessional: PartialUpdateHealthConnectProfessional): Observable<IHealthConnectProfessional> {
    return this.http.patch<IHealthConnectProfessional>(
      `${this.resourceUrl}/${encodeURIComponent(this.getHealthConnectProfessionalIdentifier(healthConnectProfessional))}`,
      healthConnectProfessional,
    );
  }

  find(id: string): Observable<IHealthConnectProfessional> {
    return this.http.get<IHealthConnectProfessional>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  query(req?: any): Observable<HttpResponse<IHealthConnectProfessional[]>> {
    const options = createRequestOption(req);
    return this.http.get<IHealthConnectProfessional[]>(this.resourceUrl, { params: options, observe: 'response' });
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getHealthConnectProfessionalIdentifier(healthConnectProfessional: Pick<IHealthConnectProfessional, 'id'>): string {
    return healthConnectProfessional.id;
  }

  compareHealthConnectProfessional(
    o1: Pick<IHealthConnectProfessional, 'id'> | null,
    o2: Pick<IHealthConnectProfessional, 'id'> | null,
  ): boolean {
    return o1 && o2 ? this.getHealthConnectProfessionalIdentifier(o1) === this.getHealthConnectProfessionalIdentifier(o2) : o1 === o2;
  }

  addHealthConnectProfessionalToCollectionIfMissing<Type extends Pick<IHealthConnectProfessional, 'id'>>(
    healthConnectProfessionalCollection: Type[],
    ...healthConnectProfessionalsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const healthConnectProfessionals: Type[] = healthConnectProfessionalsToCheck.filter(isPresent);
    if (healthConnectProfessionals.length > 0) {
      const healthConnectProfessionalCollectionIdentifiers = healthConnectProfessionalCollection.map(healthConnectProfessionalItem =>
        this.getHealthConnectProfessionalIdentifier(healthConnectProfessionalItem),
      );
      const healthConnectProfessionalsToAdd = healthConnectProfessionals.filter(healthConnectProfessionalItem => {
        const healthConnectProfessionalIdentifier = this.getHealthConnectProfessionalIdentifier(healthConnectProfessionalItem);
        if (healthConnectProfessionalCollectionIdentifiers.includes(healthConnectProfessionalIdentifier)) {
          return false;
        }
        healthConnectProfessionalCollectionIdentifiers.push(healthConnectProfessionalIdentifier);
        return true;
      });
      return [...healthConnectProfessionalsToAdd, ...healthConnectProfessionalCollection];
    }
    return healthConnectProfessionalCollection;
  }
}
