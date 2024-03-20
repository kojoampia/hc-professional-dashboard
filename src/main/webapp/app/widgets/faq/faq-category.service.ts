import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IFaqCategory } from './faq-category.model';
import { createRequestOption } from 'app/core/request/request-util';

type EntityResponseType = HttpResponse<IFaqCategory>;
type EntityArrayResponseType = HttpResponse<IFaqCategory[]>;

const MOCK_DATA: IFaqCategory[] = [
  {
    label: 'All',
    color: '',
    description: '',
    matIcon: 'th',
    svgIcon: '',
  },
  {
    label: 'Payment',
    color: '',
    description: '',
    matIcon: 'credit_card',
    svgIcon: '',
  },
  {
    label: 'Uncategorised',
    color: '',
    description: '',
    matIcon: 'dot',
    svgIcon: '',
  },
  {
    label: 'Service',
    color: '',
    description: '',
    matIcon: 'service',
    svgIcon: '',
  },
];

@Injectable({ providedIn: 'root' })
export class FaqCategoryService {
  public mock_data: IFaqCategory[] = MOCK_DATA;

  public resourceUrl = SERVER_API_URL + '/services/contentservice/api/faq-categories';

  constructor(protected http: HttpClient) {}

  create(faqCategory: IFaqCategory): Observable<EntityResponseType> {
    return this.http.post<IFaqCategory>(this.resourceUrl, faqCategory, { observe: 'response' });
  }

  update(faqCategory: IFaqCategory): Observable<EntityResponseType> {
    return this.http.put<IFaqCategory>(this.resourceUrl, faqCategory, { observe: 'response' });
  }

  find(id: string): Observable<EntityResponseType> {
    return this.http.get<IFaqCategory>(`${this.resourceUrl}/${id}`, { observe: 'response' });
  }

  query(req?: any): Observable<EntityArrayResponseType> {
    const options = createRequestOption(req);
    return this.http.get<IFaqCategory[]>(this.resourceUrl, { params: options, observe: 'response' });
  }

  delete(id: string): Observable<HttpResponse<{}>> {
    return this.http.delete(`${this.resourceUrl}/${id}`, { observe: 'response' });
  }
}
