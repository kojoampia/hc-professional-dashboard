import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { ITeam, NewTeam } from '../team.model';

export type PartialUpdateTeam = Partial<ITeam> & Pick<ITeam, 'id'>;

@Injectable()
export class TeamsService {
  readonly teamsParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(undefined);
  readonly teamsResource = httpResource<ITeam[]>(() => {
    const params = this.teamsParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of team that have been fetched. It is updated when the teamsResource emits a new value.
   * In case of error while fetching the teams, the signal is set to an empty array.
   */
  readonly teams = computed(() => (this.teamsResource.hasValue() ? this.teamsResource.value() : []));
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/teams');
}

@Injectable({ providedIn: 'root' })
export class TeamService extends TeamsService {
  protected readonly http = inject(HttpClient);

  create(team: NewTeam): Observable<ITeam> {
    return this.http.post<ITeam>(this.resourceUrl, team);
  }

  update(team: ITeam): Observable<ITeam> {
    return this.http.put<ITeam>(`${this.resourceUrl}/${encodeURIComponent(this.getTeamIdentifier(team))}`, team);
  }

  partialUpdate(team: PartialUpdateTeam): Observable<ITeam> {
    return this.http.patch<ITeam>(`${this.resourceUrl}/${encodeURIComponent(this.getTeamIdentifier(team))}`, team);
  }

  find(id: string): Observable<ITeam> {
    return this.http.get<ITeam>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  query(req?: any): Observable<HttpResponse<ITeam[]>> {
    const options = createRequestOption(req);
    return this.http.get<ITeam[]>(this.resourceUrl, { params: options, observe: 'response' });
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getTeamIdentifier(team: Pick<ITeam, 'id'>): string {
    return team.id;
  }

  compareTeam(o1: Pick<ITeam, 'id'> | null, o2: Pick<ITeam, 'id'> | null): boolean {
    return o1 && o2 ? this.getTeamIdentifier(o1) === this.getTeamIdentifier(o2) : o1 === o2;
  }

  addTeamToCollectionIfMissing<Type extends Pick<ITeam, 'id'>>(
    teamCollection: Type[],
    ...teamsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const teams: Type[] = teamsToCheck.filter(isPresent);
    if (teams.length > 0) {
      const teamCollectionIdentifiers = teamCollection.map(teamItem => this.getTeamIdentifier(teamItem));
      const teamsToAdd = teams.filter(teamItem => {
        const teamIdentifier = this.getTeamIdentifier(teamItem);
        if (teamCollectionIdentifiers.includes(teamIdentifier)) {
          return false;
        }
        teamCollectionIdentifiers.push(teamIdentifier);
        return true;
      });
      return [...teamsToAdd, ...teamCollection];
    }
    return teamCollection;
  }
}
