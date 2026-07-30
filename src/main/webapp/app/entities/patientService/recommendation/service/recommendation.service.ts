import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IRecommendation, NewRecommendation } from '../recommendation.model';

export type PartialUpdateRecommendation = Partial<IRecommendation> & Pick<IRecommendation, 'id'>;

@Injectable()
export class RecommendationsService {
  readonly recommendationsParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly recommendationsResource = httpResource<IRecommendation[]>(() => {
    const params = this.recommendationsParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of recommendation that have been fetched. It is updated when the recommendationsResource emits a new value.
   * In case of error while fetching the recommendations, the signal is set to an empty array.
   */
  readonly recommendations = computed(() => (this.recommendationsResource.hasValue() ? this.recommendationsResource.value() : []));
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/recommendations');
}

@Injectable({ providedIn: 'root' })
export class RecommendationService extends RecommendationsService {
  protected readonly http = inject(HttpClient);

  create(recommendation: NewRecommendation): Observable<IRecommendation> {
    return this.http.post<IRecommendation>(this.resourceUrl, recommendation);
  }

  update(recommendation: IRecommendation): Observable<IRecommendation> {
    return this.http.put<IRecommendation>(
      `${this.resourceUrl}/${encodeURIComponent(this.getRecommendationIdentifier(recommendation))}`,
      recommendation,
    );
  }

  partialUpdate(recommendation: PartialUpdateRecommendation): Observable<IRecommendation> {
    return this.http.patch<IRecommendation>(
      `${this.resourceUrl}/${encodeURIComponent(this.getRecommendationIdentifier(recommendation))}`,
      recommendation,
    );
  }

  find(id: string): Observable<IRecommendation> {
    return this.http.get<IRecommendation>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  query(req?: any): Observable<HttpResponse<IRecommendation[]>> {
    const options = createRequestOption(req);
    return this.http.get<IRecommendation[]>(this.resourceUrl, { params: options, observe: 'response' });
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getRecommendationIdentifier(recommendation: Pick<IRecommendation, 'id'>): string {
    return recommendation.id;
  }

  compareRecommendation(o1: Pick<IRecommendation, 'id'> | null, o2: Pick<IRecommendation, 'id'> | null): boolean {
    return o1 && o2 ? this.getRecommendationIdentifier(o1) === this.getRecommendationIdentifier(o2) : o1 === o2;
  }

  addRecommendationToCollectionIfMissing<Type extends Pick<IRecommendation, 'id'>>(
    recommendationCollection: Type[],
    ...recommendationsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const recommendations: Type[] = recommendationsToCheck.filter(isPresent);
    if (recommendations.length > 0) {
      const recommendationCollectionIdentifiers = recommendationCollection.map(recommendationItem =>
        this.getRecommendationIdentifier(recommendationItem),
      );
      const recommendationsToAdd = recommendations.filter(recommendationItem => {
        const recommendationIdentifier = this.getRecommendationIdentifier(recommendationItem);
        if (recommendationCollectionIdentifiers.includes(recommendationIdentifier)) {
          return false;
        }
        recommendationCollectionIdentifiers.push(recommendationIdentifier);
        return true;
      });
      return [...recommendationsToAdd, ...recommendationCollection];
    }
    return recommendationCollection;
  }
}
