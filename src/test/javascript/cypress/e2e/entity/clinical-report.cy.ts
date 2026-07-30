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

describe('ClinicalReport e2e test', () => {
  const clinicalReportPageUrl = '/clinical-report';
  const clinicalReportPageUrlPattern = new RegExp('/clinical-report(\\?.*)?$');
  let username: string;
  let password: string;
  const clinicalReportSample = {};

  let clinicalReport;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/services/patientservice/api/clinical-reports+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/patientservice/api/clinical-reports').as('postEntityRequest');
    cy.intercept('DELETE', '/services/patientservice/api/clinical-reports/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (clinicalReport) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/patientservice/api/clinical-reports/${clinicalReport.id}`,
      }).then(() => {
        clinicalReport = undefined;
      });
    }
  });

  it('ClinicalReports menu should load ClinicalReports page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('clinical-report');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('ClinicalReport').should('exist');
    cy.url().should('match', clinicalReportPageUrlPattern);
  });

  describe('ClinicalReport page', () => {
    it('should have translated page title', () => {
      cy.visit(clinicalReportPageUrl);
      cy.getEntityHeading('ClinicalReport').should('not.contain', 'professionalDashboardApp.patientServiceClinicalReport.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(clinicalReportPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create ClinicalReport page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.url().should('match', new RegExp('/clinical-report/new$'));
        cy.getEntityCreateUpdateHeading('ClinicalReport');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', clinicalReportPageUrlPattern);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/services/patientservice/api/clinical-reports',
          body: clinicalReportSample,
        }).then(({ body }) => {
          clinicalReport = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/patientservice/api/clinical-reports+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [clinicalReport],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(clinicalReportPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details ClinicalReport page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('clinicalReport');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', clinicalReportPageUrlPattern);
      });

      it('edit button click should load edit ClinicalReport page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('ClinicalReport');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', clinicalReportPageUrlPattern);
      });

      it('edit button click should load edit ClinicalReport page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('ClinicalReport');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', clinicalReportPageUrlPattern);
      });

      it('last delete button click should delete instance of ClinicalReport', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('clinicalReport').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', clinicalReportPageUrlPattern);

        clinicalReport = undefined;
      });
    });
  });

  describe('new ClinicalReport page', () => {
    beforeEach(() => {
      cy.visit(clinicalReportPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('ClinicalReport');
    });

    it('should create an instance of ClinicalReport', () => {
      cy.get(`[data-cy="patientId"]`).type('shirk');
      cy.get(`[data-cy="patientId"]`).should('have.value', 'shirk');

      cy.get(`[data-cy="occurredAt"]`).type('2026-07-23T13:50');
      cy.get(`[data-cy="occurredAt"]`).blur();
      cy.get(`[data-cy="occurredAt"]`).should('have.value', '2026-07-23T13:50');

      cy.get(`[data-cy="label"]`).type('eek zowie');
      cy.get(`[data-cy="label"]`).should('have.value', 'eek zowie');

      cy.get(`[data-cy="reportType"]`).type('ultimately beneath');
      cy.get(`[data-cy="reportType"]`).should('have.value', 'ultimately beneath');

      cy.get(`[data-cy="url"]`).type('https://troubled-assist.com/');
      cy.get(`[data-cy="url"]`).should('have.value', 'https://troubled-assist.com/');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        clinicalReport = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.url().should('match', clinicalReportPageUrlPattern);
    });
  });
});
