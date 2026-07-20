import {
  HEALTH_CONNECT_DUTY_ROSTERS,
  HEALTH_CONNECT_PATIENT_RECORDS,
  HEALTH_CONNECT_PROFESSIONALS,
  HEALTH_CONNECT_RECOMMENDATIONS,
} from './health-connect.fixtures';

describe('HealthConnect frontend models', () => {
  it('provides deterministic, internally linked fixture models', () => {
    const patientIds = new Set(HEALTH_CONNECT_PATIENT_RECORDS.map(record => record.patient.id));
    const rosterIds = new Set(HEALTH_CONNECT_DUTY_ROSTERS.map(roster => roster.id));
    const professionalIds = new Set(HEALTH_CONNECT_PROFESSIONALS.map(professional => professional.id));

    expect(HEALTH_CONNECT_RECOMMENDATIONS.map(recommendation => recommendation.id)).toEqual([
      'hpv',
      'kidney-stones',
      'x-ray',
      'prostate-test',
    ]);
    expect(
      HEALTH_CONNECT_PATIENT_RECORDS.flatMap(record =>
        record.cases.map(clinicalCase => ({
          patientExists: patientIds.has(clinicalCase.patientId),
          rosterExists: rosterIds.has(clinicalCase.assignedRosterId ?? ''),
          professionalExists: professionalIds.has(clinicalCase.assignedProfessionalId ?? ''),
        })),
      ),
    ).toEqual(expect.arrayContaining([expect.objectContaining({ patientExists: true, rosterExists: true, professionalExists: true })]));
  });
});
