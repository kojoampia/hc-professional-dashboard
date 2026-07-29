import dayjs from 'dayjs/esm';

/**
 * 'urgent' | 'open' | 'closed' — added ahead of backend support (see
 * professional-web.md §5). Optional until the
 * med-case backend schema exposes it.
 */
export type MedCaseStatus = 'urgent' | 'open' | 'closed';

export interface IMedCase {
  id: string;
  symptoms?: string | null;
  diagnoses?: string | null;
  recommendations?: string | null;
  createdDate?: dayjs.Dayjs | null;
  createdBy?: string | null;
  modifiedDate?: dayjs.Dayjs | null;
  modifiedBy?: string | null;
  /** Not yet supported by the backend — see professional-web.md §5. */
  patientId?: string | null;
  /** Not yet supported by the backend — see professional-web.md §5. */
  status?: MedCaseStatus | null;
  /** Not yet supported by the backend — see professional-web.md §5. */
  assignedRosterId?: string | null;
  /** Short summary distinct from the full symptoms/diagnoses text; not yet supported by the backend. */
  brief?: string | null;
}

export type NewMedCase = Omit<IMedCase, 'id'> & { id: null };
