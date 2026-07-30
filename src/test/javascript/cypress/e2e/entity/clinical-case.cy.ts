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

describe('ClinicalCase e2e test', () => {
  const clinicalCasePageUrl = '/clinical-case';
  const clinicalCasePageUrlPattern = new RegExp('/clinical-case(\\?.*)?$');
  let username: string;
  let password: string;
  const clinicalCaseSample = {};

  let clinicalCase;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/services/patientservice/api/clinical-cases+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/patientservice/api/clinical-cases').as('postEntityRequest');
    cy.intercept('DELETE', '/services/patientservice/api/clinical-cases/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (clinicalCase) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/patientservice/api/clinical-cases/${clinicalCase.id}`,
      }).then(() => {
        clinicalCase = undefined;
      });
    }
  });

  it('ClinicalCases menu should load ClinicalCases page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('clinical-case');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('ClinicalCase').should('exist');
    cy.url().should('match', clinicalCasePageUrlPattern);
  });

  describe('ClinicalCase page', () => {
    it('should have translated page title', () => {
      cy.visit(clinicalCasePageUrl);
      cy.getEntityHeading('ClinicalCase').should('not.contain', 'professionalDashboardApp.patientServiceClinicalCase.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(clinicalCasePageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create ClinicalCase page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.url().should('match', new RegExp('/clinical-case/new$'));
        cy.getEntityCreateUpdateHeading('ClinicalCase');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', clinicalCasePageUrlPattern);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/services/patientservice/api/clinical-cases',
          body: clinicalCaseSample,
        }).then(({ body }) => {
          clinicalCase = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/patientservice/api/clinical-cases+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              headers: {
                link: '<http://localhost/services/patientservice/api/clinical-cases?page=0&size=20>; rel="last",<http://localhost/services/patientservice/api/clinical-cases?page=0&size=20>; rel="first"',
              },
              body: [clinicalCase],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(clinicalCasePageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details ClinicalCase page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('clinicalCase');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', clinicalCasePageUrlPattern);
      });

      it('edit button click should load edit ClinicalCase page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('ClinicalCase');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', clinicalCasePageUrlPattern);
      });

      it('edit button click should load edit ClinicalCase page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('ClinicalCase');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', clinicalCasePageUrlPattern);
      });

      it('last delete button click should delete instance of ClinicalCase', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('clinicalCase').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', clinicalCasePageUrlPattern);

        clinicalCase = undefined;
      });
    });
  });

  describe('new ClinicalCase page', () => {
    beforeEach(() => {
      cy.visit(clinicalCasePageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('ClinicalCase');
    });

    it('should create an instance of ClinicalCase', () => {
      cy.get(`[data-cy="patientId"]`).type('worriedly');
      cy.get(`[data-cy="patientId"]`).should('have.value', 'worriedly');

      cy.get(`[data-cy="openedAt"]`).type('2026-07-29T18:11');
      cy.get(`[data-cy="openedAt"]`).blur();
      cy.get(`[data-cy="openedAt"]`).should('have.value', '2026-07-29T18:11');

      cy.get(`[data-cy="brief"]`).type('failing irritably freely');
      cy.get(`[data-cy="brief"]`).should('have.value', 'failing irritably freely');

      cy.get(`[data-cy="status"]`).select('CLOSED');

      cy.get(`[data-cy="symptoms"]`).type('onto quiet');
      cy.get(`[data-cy="symptoms"]`).should('have.value', 'onto quiet');

      cy.get(`[data-cy="diagnosis"]`).type('whenever');
      cy.get(`[data-cy="diagnosis"]`).should('have.value', 'whenever');

      cy.get(`[data-cy="assignedProfessionalId"]`).type('of gah');
      cy.get(`[data-cy="assignedProfessionalId"]`).should('have.value', 'of gah');

      cy.get(`[data-cy="assignedRosterId"]`).type('monthly minion back');
      cy.get(`[data-cy="assignedRosterId"]`).should('have.value', 'monthly minion back');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        clinicalCase = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.url().should('match', clinicalCasePageUrlPattern);
    });
  });
});
