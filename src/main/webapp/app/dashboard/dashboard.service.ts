import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private resourceUrl = this.applicationConfigService.getEndpointFor('api/profiles', 'hcprofessionalservice');

  constructor(
    private http: HttpClient,
    private applicationConfigService: ApplicationConfigService,
  ) {}

  fetchInformationByEmail(email: string): Observable<any> {
    return this.http.get<any>(`${this.resourceUrl}/email/${email}`);
  }
}
