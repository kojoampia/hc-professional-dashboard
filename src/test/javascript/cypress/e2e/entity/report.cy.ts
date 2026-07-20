import {
  entityTableSelector,
  entityDetailsButtonSelector,
  entityDetailsBackButtonSelector,
  entityCreateButtonSelector,
  entityCreateSaveButtonSelector,
  entityCreateCancelButtonSelector,
  entityEditButtonSelector,
  entityDeleteButtonSelector,
  entityConfirmDeleteButtonSelector,
} from '../../support/entity';

describe('Report e2e test', () => {
  const reportPageUrl = '/report';
  const reportPageUrlPattern = new RegExp('/report(\\?.*)?$');
  const username = Cypress.env('E2E_USERNAME') ?? 'user';
  const password = Cypress.env('E2E_PASSWORD') ?? 'user';
  const reportSample = {};

  let report;

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/services/professionalService/api/reports+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/professionalService/api/reports').as('postEntityRequest');
    cy.intercept('DELETE', '/services/professionalService/api/reports/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (report) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/professionalService/api/reports/${report.id}`,
      }).then(() => {
        report = undefined;
      });
    }
  });

  it('Reports menu should load Reports page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('report');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Report').should('exist');
    cy.url().should('match', reportPageUrlPattern);
  });

  describe('Report page', () => {
    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(reportPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create Report page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.url().should('match', new RegExp('/report/new$'));
        cy.getEntityCreateUpdateHeading('Report');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', reportPageUrlPattern);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/services/professionalService/api/reports',
          body: reportSample,
        }).then(({ body }) => {
          report = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/professionalService/api/reports+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [report],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(reportPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details Report page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('report');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', reportPageUrlPattern);
      });

      it('edit button click should load edit Report page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Report');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', reportPageUrlPattern);
      });

      it('edit button click should load edit Report page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Report');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', reportPageUrlPattern);
      });

      it('last delete button click should delete instance of Report', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('report').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', reportPageUrlPattern);

        report = undefined;
      });
    });
  });

  describe('new Report page', () => {
    beforeEach(() => {
      cy.visit(`${reportPageUrl}`);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Report');
    });

    it('should create an instance of Report', () => {
      cy.get(`[data-cy="category"]`).type('mouse discuss how');
      cy.get(`[data-cy="category"]`).should('have.value', 'mouse discuss how');

      cy.get(`[data-cy="description"]`).type('during upon besides');
      cy.get(`[data-cy="description"]`).should('have.value', 'during upon besides');

      cy.get(`[data-cy="name"]`).type('gadzooks once');
      cy.get(`[data-cy="name"]`).should('have.value', 'gadzooks once');

      cy.get(`[data-cy="url"]`).type('https://defenseless-functionality.info/');
      cy.get(`[data-cy="url"]`).should('have.value', 'https://defenseless-functionality.info/');

      cy.get(`[data-cy="createdDate"]`).type('2024-02-06');
      cy.get(`[data-cy="createdDate"]`).blur();
      cy.get(`[data-cy="createdDate"]`).should('have.value', '2024-02-06');

      cy.get(`[data-cy="modifiedDate"]`).type('2024-02-06');
      cy.get(`[data-cy="modifiedDate"]`).blur();
      cy.get(`[data-cy="modifiedDate"]`).should('have.value', '2024-02-06');

      cy.get(`[data-cy="createdBy"]`).type('ew pish');
      cy.get(`[data-cy="createdBy"]`).should('have.value', 'ew pish');

      cy.get(`[data-cy="modifiedBy"]`).type('per burly');
      cy.get(`[data-cy="modifiedBy"]`).should('have.value', 'per burly');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response.statusCode).to.equal(201);
        report = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response.statusCode).to.equal(200);
      });
      cy.url().should('match', reportPageUrlPattern);
    });
  });
});
