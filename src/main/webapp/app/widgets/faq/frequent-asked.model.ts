import dayjs from 'dayjs/esm';
import { IFaqCategory } from './faq-category.model';

export interface IFrequentAsked {
  id?: string;
  question?: string;
  answer?: string;
  category?: IFaqCategory;
  createdDate?: dayjs.Dayjs;
  createdBy?: string;
  modifiedDate?: dayjs.Dayjs;
  modifiedBy?: string;
}

export class FrequentAsked implements IFrequentAsked {
  constructor(
    public id?: string,
    public question?: string,
    public answer?: string,
    public category?: IFaqCategory,
    public createdDate?: dayjs.Dayjs,
    public createdBy?: string,
    public modifiedDate?: dayjs.Dayjs,
    public modifiedBy?: string,
  ) {}
}
