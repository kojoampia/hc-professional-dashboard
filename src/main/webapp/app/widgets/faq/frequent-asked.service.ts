import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { IFrequentAsked } from './frequent-asked.model';
import dayjs from 'dayjs/esm';
import { createRequestOption } from 'app/core/request/request-util';

type EntityResponseType = HttpResponse<IFrequentAsked>;
type EntityArrayResponseType = HttpResponse<IFrequentAsked[]>;

const MOCK_DATA: IFrequentAsked[] = [
  {
    id: '01',
    question: '[MOCK] Which Insurance Packages or Policies are compulsory in Ghana?',
    answer: 'Motor Insurance',
    category: { label: 'uncategorized' },
    createdBy: 'admin@localhost',
    createdDate: dayjs(Date.now()),
    modifiedBy: 'admin@localhost',
    modifiedDate: dayjs(Date.now()),
  },
  {
    id: '02',
    question: '[MOCK] How much does Motor Insurance cost?',
    answer:
      'It depends on the Cover type you sign up for; Available cover types are Comprehensive, Third-Party Fire and Theft, and Third-Party Only.',
    category: { label: 'Payment' },
    createdBy: 'admin@localhost',
    createdDate: dayjs(Date.now()),
    modifiedBy: 'admin@localhost',
    modifiedDate: dayjs(Date.now()),
  },
  {
    id: '03',
    question: '[MOCK] Can I transfer Insurance cover from one vehicle to another?',
    answer: 'No, rather, you can cancel the existing policy, and use the refund to start a new policy for the new vehicle.',
    category: { label: 'uncategorized' },
    createdBy: 'admin@localhost',
    createdDate: dayjs(Date.now()),
    modifiedBy: 'admin@localhost',
    modifiedDate: dayjs(Date.now()),
  },
  {
    id: '04',
    question: '[MOCK] How much is a Comprehensive Motor Insurance cover?',
    answer: 'The Premium depends on the value/cost of the vehicle being insured.',
    category: { label: 'uncategorized' },
    createdBy: 'admin@localhost',
    createdDate: dayjs(Date.now()),
    modifiedBy: 'admin@localhost',
    modifiedDate: dayjs(Date.now()),
  },
];

@Injectable({ providedIn: 'root' })
export class FrequentAskedService {
  public mock_data: IFrequentAsked[] = MOCK_DATA;

  public resourceUrl = SERVER_API_URL + '/services/contentservice/api/frequent-askeds';

  constructor(protected http: HttpClient) {}

  create(frequentAsked: IFrequentAsked): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(frequentAsked);
    return this.http
      .post<IFrequentAsked>(this.resourceUrl, copy, { observe: 'response' })
      .pipe(map((res: EntityResponseType) => this.convertDateFromServer(res)));
  }

  update(frequentAsked: IFrequentAsked): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(frequentAsked);
    return this.http
      .put<IFrequentAsked>(this.resourceUrl, copy, { observe: 'response' })
      .pipe(map((res: EntityResponseType) => this.convertDateFromServer(res)));
  }

  find(id: string): Observable<EntityResponseType> {
    return this.http
      .get<IFrequentAsked>(`${this.resourceUrl}/${id}`, { observe: 'response' })
      .pipe(map((res: EntityResponseType) => this.convertDateFromServer(res)));
  }

  query(req?: any): Observable<EntityArrayResponseType> {
    const options = createRequestOption(req);
    return this.http
      .get<IFrequentAsked[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map((res: EntityArrayResponseType) => this.convertDateArrayFromServer(res)));
  }

  delete(id: string): Observable<HttpResponse<{}>> {
    return this.http.delete(`${this.resourceUrl}/${id}`, { observe: 'response' });
  }

  protected convertDateFromClient(frequentAsked: IFrequentAsked): IFrequentAsked {
    const copy: IFrequentAsked = Object.assign({}, frequentAsked, {
      createdDate: frequentAsked.createdDate && frequentAsked.createdDate.isValid() ? frequentAsked.createdDate.toJSON() : undefined,
      modifiedDate: frequentAsked.modifiedDate && frequentAsked.modifiedDate.isValid() ? frequentAsked.modifiedDate.toJSON() : undefined,
    });
    return copy;
  }

  protected convertDateFromServer(res: EntityResponseType): EntityResponseType {
    if (res.body) {
      res.body.createdDate = res.body.createdDate ? dayjs(res.body.createdDate) : undefined;
      res.body.modifiedDate = res.body.modifiedDate ? dayjs(res.body.modifiedDate) : undefined;
    }
    return res;
  }

  protected convertDateArrayFromServer(res: EntityArrayResponseType): EntityArrayResponseType {
    if (res.body) {
      res.body.forEach((frequentAsked: IFrequentAsked) => {
        frequentAsked.createdDate = frequentAsked.createdDate ? dayjs(frequentAsked.createdDate) : undefined;
        frequentAsked.modifiedDate = frequentAsked.modifiedDate ? dayjs(frequentAsked.modifiedDate) : undefined;
      });
    }
    return res;
  }
}
