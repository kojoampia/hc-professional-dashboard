import {
  entityConfirmDeleteButtonSelector,
  entityCreateButtonSelector,
  entityCreateCancelButtonSelector,
  entityCreateSaveButtonSelector,
  entityDeleteButtonSelector,
  entityDetailsBackButtonSelector,
  entityDetailsButtonSelector,
  entityEditButtonSelector,
  entityTableSelector,
} from '../../support/entity';

describe('MedicationRecord e2e test', () => {
  const medicationRecordPageUrl = '/medication-record';
  const medicationRecordPageUrlPattern = new RegExp('/medication-record(\\?.*)?$');
  let username: string;
  let password: string;
  const medicationRecordSample = {};

  let medicationRecord;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/services/patientservice/api/medication-records+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/patientservice/api/medication-records').as('postEntityRequest');
    cy.intercept('DELETE', '/services/patientservice/api/medication-records/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (medicationRecord) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/patientservice/api/medication-records/${medicationRecord.id}`,
      }).then(() => {
        medicationRecord = undefined;
      });
    }
  });

  it('MedicationRecords menu should load MedicationRecords page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('medication-record');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('MedicationRecord').should('exist');
    cy.url().should('match', medicationRecordPageUrlPattern);
  });

  describe('MedicationRecord page', () => {
    it('should have translated page title', () => {
      cy.visit(medicationRecordPageUrl);
      cy.getEntityHeading('MedicationRecord').should('not.contain', 'professionalDashboardApp.patientServiceMedicationRecord.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(medicationRecordPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create MedicationRecord page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.url().should('match', new RegExp('/medication-record/new$'));
        cy.getEntityCreateUpdateHeading('MedicationRecord');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', medicationRecordPageUrlPattern);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/services/patientservice/api/medication-records',
          body: medicationRecordSample,
        }).then(({ body }) => {
          medicationRecord = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/patientservice/api/medication-records+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [medicationRecord],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(medicationRecordPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details MedicationRecord page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('medicationRecord');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', medicationRecordPageUrlPattern);
      });

      it('edit button click should load edit MedicationRecord page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('MedicationRecord');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', medicationRecordPageUrlPattern);
      });

      it('edit button click should load edit MedicationRecord page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('MedicationRecord');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', medicationRecordPageUrlPattern);
      });

      it('last delete button click should delete instance of MedicationRecord', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('medicationRecord').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', medicationRecordPageUrlPattern);

        medicationRecord = undefined;
      });
    });
  });

  describe('new MedicationRecord page', () => {
    beforeEach(() => {
      cy.visit(medicationRecordPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('MedicationRecord');
    });

    it('should create an instance of MedicationRecord', () => {
      cy.get(`[data-cy="patientId"]`).type('minority concerning fundraising');
      cy.get(`[data-cy="patientId"]`).should('have.value', 'minority concerning fundraising');

      cy.get(`[data-cy="occurredAt"]`).type('2026-07-23T22:48');
      cy.get(`[data-cy="occurredAt"]`).blur();
      cy.get(`[data-cy="occurredAt"]`).should('have.value', '2026-07-23T22:48');

      cy.get(`[data-cy="label"]`).type('quart');
      cy.get(`[data-cy="label"]`).should('have.value', 'quart');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        medicationRecord = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.url().should('match', medicationRecordPageUrlPattern);
    });
  });
});
