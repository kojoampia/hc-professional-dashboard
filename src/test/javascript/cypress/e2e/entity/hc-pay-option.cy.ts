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

describe('HCPayOption e2e test', () => {
  const hCPayOptionPageUrl = '/hc-pay-option';
  const hCPayOptionPageUrlPattern = new RegExp('/hc-pay-option(\\?.*)?$');
  const username = Cypress.env('E2E_USERNAME') ?? 'user';
  const password = Cypress.env('E2E_PASSWORD') ?? 'user';
  const hCPayOptionSample = {};

  let hCPayOption;

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/services/professionalService/api/hc-pay-options+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/professionalService/api/hc-pay-options').as('postEntityRequest');
    cy.intercept('DELETE', '/services/professionalService/api/hc-pay-options/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (hCPayOption) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/professionalService/api/hc-pay-options/${hCPayOption.id}`,
      }).then(() => {
        hCPayOption = undefined;
      });
    }
  });

  it('HCPayOptions menu should load HCPayOptions page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('hc-pay-option');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('HCPayOption').should('exist');
    cy.url().should('match', hCPayOptionPageUrlPattern);
  });

  describe('HCPayOption page', () => {
    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(hCPayOptionPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create HCPayOption page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.url().should('match', new RegExp('/hc-pay-option/new$'));
        cy.getEntityCreateUpdateHeading('HCPayOption');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', hCPayOptionPageUrlPattern);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/services/professionalService/api/hc-pay-options',
          body: hCPayOptionSample,
        }).then(({ body }) => {
          hCPayOption = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/professionalService/api/hc-pay-options+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [hCPayOption],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(hCPayOptionPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details HCPayOption page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('hCPayOption');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', hCPayOptionPageUrlPattern);
      });

      it('edit button click should load edit HCPayOption page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('HCPayOption');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', hCPayOptionPageUrlPattern);
      });

      it('edit button click should load edit HCPayOption page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('HCPayOption');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', hCPayOptionPageUrlPattern);
      });

      it('last delete button click should delete instance of HCPayOption', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('hCPayOption').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', hCPayOptionPageUrlPattern);

        hCPayOption = undefined;
      });
    });
  });

  describe('new HCPayOption page', () => {
    beforeEach(() => {
      cy.visit(`${hCPayOptionPageUrl}`);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('HCPayOption');
    });

    it('should create an instance of HCPayOption', () => {
      cy.get(`[data-cy="type"]`).type('regularly');
      cy.get(`[data-cy="type"]`).should('have.value', 'regularly');

      cy.get(`[data-cy="userID"]`).type('wasteful');
      cy.get(`[data-cy="userID"]`).should('have.value', 'wasteful');

      cy.get(`[data-cy="metadata"]`).type('geez');
      cy.get(`[data-cy="metadata"]`).should('have.value', 'geez');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response.statusCode).to.equal(201);
        hCPayOption = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response.statusCode).to.equal(200);
      });
      cy.url().should('match', hCPayOptionPageUrlPattern);
    });
  });
});
