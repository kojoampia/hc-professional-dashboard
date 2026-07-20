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

describe('Medication e2e test', () => {
  const medicationPageUrl = '/medication';
  const medicationPageUrlPattern = new RegExp('/medication(\\?.*)?$');
  const username = Cypress.env('E2E_USERNAME') ?? 'user';
  const password = Cypress.env('E2E_PASSWORD') ?? 'user';
  const medicationSample = {};

  let medication;

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/services/professionalService/api/medications+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/professionalService/api/medications').as('postEntityRequest');
    cy.intercept('DELETE', '/services/professionalService/api/medications/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (medication) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/professionalService/api/medications/${medication.id}`,
      }).then(() => {
        medication = undefined;
      });
    }
  });

  it('Medications menu should load Medications page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('medication');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Medication').should('exist');
    cy.url().should('match', medicationPageUrlPattern);
  });

  describe('Medication page', () => {
    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(medicationPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create Medication page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.url().should('match', new RegExp('/medication/new$'));
        cy.getEntityCreateUpdateHeading('Medication');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', medicationPageUrlPattern);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/services/professionalService/api/medications',
          body: medicationSample,
        }).then(({ body }) => {
          medication = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/professionalService/api/medications+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [medication],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(medicationPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details Medication page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('medication');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', medicationPageUrlPattern);
      });

      it('edit button click should load edit Medication page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Medication');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', medicationPageUrlPattern);
      });

      it('edit button click should load edit Medication page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Medication');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', medicationPageUrlPattern);
      });

      it('last delete button click should delete instance of Medication', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('medication').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', medicationPageUrlPattern);

        medication = undefined;
      });
    });
  });

  describe('new Medication page', () => {
    beforeEach(() => {
      cy.visit(`${medicationPageUrl}`);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Medication');
    });

    it('should create an instance of Medication', () => {
      cy.get(`[data-cy="name"]`).type('rapidly');
      cy.get(`[data-cy="name"]`).should('have.value', 'rapidly');

      cy.get(`[data-cy="description"]`).type('silhouette above');
      cy.get(`[data-cy="description"]`).should('have.value', 'silhouette above');

      cy.get(`[data-cy="prescription"]`).type('incidentally draft amid');
      cy.get(`[data-cy="prescription"]`).should('have.value', 'incidentally draft amid');

      cy.get(`[data-cy="createdDate"]`).type('2024-02-06');
      cy.get(`[data-cy="createdDate"]`).blur();
      cy.get(`[data-cy="createdDate"]`).should('have.value', '2024-02-06');

      cy.get(`[data-cy="modifiedDate"]`).type('2024-02-06');
      cy.get(`[data-cy="modifiedDate"]`).blur();
      cy.get(`[data-cy="modifiedDate"]`).should('have.value', '2024-02-06');

      cy.get(`[data-cy="createdBy"]`).type('mostly gosh');
      cy.get(`[data-cy="createdBy"]`).should('have.value', 'mostly gosh');

      cy.get(`[data-cy="modifiedBy"]`).type('anxiously');
      cy.get(`[data-cy="modifiedBy"]`).should('have.value', 'anxiously');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response.statusCode).to.equal(201);
        medication = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response.statusCode).to.equal(200);
      });
      cy.url().should('match', medicationPageUrlPattern);
    });
  });
});
