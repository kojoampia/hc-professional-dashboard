import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SERVER_API_URL } from 'app/app.constants';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PhoneNumberVerifierService {
  protected resourceUrl = SERVER_API_URL + '/services/customerservice/api';

  constructor(protected http: HttpClient) {}

  sendPhoneNumberVerification(destinationNumber: Object): Observable<HttpResponse<any>> {
    return this.http.post<any>(`${this.resourceUrl}/number/verification/`, destinationNumber, { observe: 'response' });
  }

  verifyPhoneNumberCode(destinationCodeNumber: any): Observable<HttpResponse<any>> {
    return this.http.post<any>(`${this.resourceUrl}/code/verification/`, destinationCodeNumber, { observe: 'response' });
  }
}
