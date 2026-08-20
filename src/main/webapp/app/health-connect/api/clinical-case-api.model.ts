import dayjs from 'dayjs/esm';

/**
 * The `patientservice` clinical-case wire contract.
 *
 * <p>Inherited from the generated entity layer under `entities/patientservice/clinical-case/` when
 * that layer was removed, reduced to the shape this application actually reads. The names and
 * casing are the server's, not ours — `status` is upper-case here and lower-case on the feature
 * model {@link ClinicalCase} it maps to, which is why the repository converts rather than casts.
 */
export interface ClinicalCaseDto {
  id: string;
  patientId?: string | null;
  openedAt?: dayjs.Dayjs | null;
  brief?: string | null;
  status?: ClinicalCaseStatusDto | null;
  symptoms?: string | null;
  diagnosis?: string | null;
  assignedProfessionalId?: string | null;
  assignedRosterId?: string | null;
  /**
   * A real many-to-many on the server, so this arrives as related objects — but a bare id list is
   * also accepted, because whether the backend serialises the relationship depends on the endpoint.
   * The repository handles both.
   */
  recommendations?: (ClinicalCaseRecommendationRefDto | string)[] | null;
}

export type ClinicalCaseStatusDto = 'URGENT' | 'OPEN' | 'CLOSED';

export interface ClinicalCaseRecommendationRefDto {
  id: string;
}

/** What a PATCH may carry: any subset, plus the id that identifies the target. */
export type PartialUpdateClinicalCaseDto = Partial<ClinicalCaseDto> & Pick<ClinicalCaseDto, 'id'>;

/** As it travels: `openedAt` is an ISO string on the wire and a dayjs instance in the app. */
export type RestClinicalCaseDto = Omit<ClinicalCaseDto, 'openedAt'> & { openedAt?: string | null };
