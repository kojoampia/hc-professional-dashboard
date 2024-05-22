import dayjs from 'dayjs/esm';
import { DocumentType } from 'app/entities/enumerations/document-type.model';

export interface IDocument {
  id: string;
  name?: string | null;
  profileId?: string | null;
  data?: string | null;
  dataContentType?: string | null;
  type?: keyof typeof DocumentType | null;
  createdDate?: dayjs.Dayjs | null;
  modifiedDate?: dayjs.Dayjs | null;
  lastModifiedBy?: string | null;
}

export type NewDocument = Omit<IDocument, 'id'> & { id: null };
