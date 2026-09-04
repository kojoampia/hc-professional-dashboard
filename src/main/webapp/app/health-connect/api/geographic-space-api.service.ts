import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';

/**
 * A geographic space, as hc-admin's `GeographicSpaceReferenceResource` projects it.
 *
 * <p>Four fields and no more, by that endpoint's design: it is a narrow purpose-built read rather
 * than a widened entity surface, so a field added to hc-admin's `GeographicSpace` does not join this
 * by default.
 */
export interface GeographicSpaceDto {
  id: string;
  name: string;
  type?: string | null;
  parentId?: string | null;
}

/**
 * Turns the opaque `geographicSpaceId` on a round into a place name.
 *
 * <h2>hc-admin owns the geography, and that is why this is a client rather than a model</h2>
 *
 * <p>`DutyRoster.geographicSpaceId` is stored opaquely by `professionalservice` — no tree, no parent
 * chain, no validation. hc-admin serves `GET /api/geographic-spaces/{id}` (id, name, type, parent)
 * precisely so this product can render a name without keeping a second copy of somebody else's
 * hierarchy. **Resolve and cache; do not model the tree here.**
 *
 * <p>The call goes through this stack's own gateway on the `adminservice` prefix, the same route
 * `earnings-api.service.ts` uses. hc-admin's api gates that endpoint on authentication alone,
 * deliberately: it describes a place rather than a person and reads the same for every caller.
 *
 * <h2>Cached for the life of the page, and never invalidated</h2>
 *
 * <p>A district does not get renamed while somebody is looking at a week of rounds, and a roster
 * view asks for the same handful of ids over and over — once per round, on every re-render. The
 * cache is a map of shared observables, so concurrent lookups of one id make one request and a
 * repeat makes none.
 *
 * <p><b>A failure is cached too, as "no name".</b> That is deliberate: hc-admin being unreachable
 * must not turn a roster into a stall or a retry storm, and a round is perfectly readable with a
 * time, a shift and no area beside it. The screen shows nothing rather than an error, because the
 * area is a nicety and the round is the information. A page reload is the retry.
 */
@Injectable({ providedIn: 'root' })
export class GeographicSpaceApiService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/geographic-spaces', 'adminservice');

  private readonly cache = new Map<string, Observable<string | null>>();

  /**
   * The space's name, or null when it has none, cannot be read, or was never asked about.
   *
   * @param id the opaque id carried on a round; null or blank yields null without a request.
   */
  name(id: string | null | undefined): Observable<string | null> {
    if (!id) {
      return of(null);
    }
    const cached = this.cache.get(id);
    if (cached) {
      return cached;
    }
    const lookup = this.http.get<GeographicSpaceDto>(`${this.resourceUrl}/${encodeURIComponent(id)}`).pipe(
      map(space => space.name ?? null),
      catchError(() => of(null)),
      // refCount:false, so the cached value survives the last subscriber unsubscribing — otherwise
      // a list that renders each round once would re-request every id on every change detection.
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.cache.set(id, lookup);
    return lookup;
  }
}
