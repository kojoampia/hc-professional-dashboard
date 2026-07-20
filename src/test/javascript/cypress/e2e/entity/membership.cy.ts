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

describe('Membership e2e test', () => {
  const membershipPageUrl = '/membership';
  const membershipPageUrlPattern = new RegExp('/membership(\\?.*)?$');
  const username = Cypress.env('E2E_USERNAME') ?? 'user';
  const password = Cypress.env('E2E_PASSWORD') ?? 'user';
  const membershipSample = {};

  let membership;

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/services/professionalService/api/memberships+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/professionalService/api/memberships').as('postEntityRequest');
    cy.intercept('DELETE', '/services/professionalService/api/memberships/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (membership) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/professionalService/api/memberships/${membership.id}`,
      }).then(() => {
        membership = undefined;
      });
    }
  });

  it('Memberships menu should load Memberships page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('membership');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Membership').should('exist');
    cy.url().should('match', membershipPageUrlPattern);
  });

  describe('Membership page', () => {
    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(membershipPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create Membership page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.url().should('match', new RegExp('/membership/new$'));
        cy.getEntityCreateUpdateHeading('Membership');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', membershipPageUrlPattern);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/services/professionalService/api/memberships',
          body: membershipSample,
        }).then(({ body }) => {
          membership = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/professionalService/api/memberships+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [membership],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(membershipPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details Membership page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('membership');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', membershipPageUrlPattern);
      });

      it('edit button click should load edit Membership page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Membership');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', membershipPageUrlPattern);
      });

      it('edit button click should load edit Membership page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Membership');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', membershipPageUrlPattern);
      });

      it('last delete button click should delete instance of Membership', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('membership').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', membershipPageUrlPattern);

        membership = undefined;
      });
    });
  });

  describe('new Membership page', () => {
    beforeEach(() => {
      cy.visit(`${membershipPageUrl}`);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Membership');
    });

    it('should create an instance of Membership', () => {
      cy.get(`[data-cy="name"]`).type('that');
      cy.get(`[data-cy="name"]`).should('have.value', 'that');

      cy.get(`[data-cy="description"]`).type('immediately');
      cy.get(`[data-cy="description"]`).should('have.value', 'immediately');

      cy.get(`[data-cy="status"]`).type('underscore');
      cy.get(`[data-cy="status"]`).should('have.value', 'underscore');

      cy.get(`[data-cy="createdDate"]`).type('2024-02-06');
      cy.get(`[data-cy="createdDate"]`).blur();
      cy.get(`[data-cy="createdDate"]`).should('have.value', '2024-02-06');

      cy.get(`[data-cy="modifiedDate"]`).type('2024-02-06');
      cy.get(`[data-cy="modifiedDate"]`).blur();
      cy.get(`[data-cy="modifiedDate"]`).should('have.value', '2024-02-06');

      cy.get(`[data-cy="createdBy"]`).type('kindheartedly false across');
      cy.get(`[data-cy="createdBy"]`).should('have.value', 'kindheartedly false across');

      cy.get(`[data-cy="modifiedBy"]`).type('very yippee until');
      cy.get(`[data-cy="modifiedBy"]`).should('have.value', 'very yippee until');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response.statusCode).to.equal(201);
        membership = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response.statusCode).to.equal(200);
      });
      cy.url().should('match', membershipPageUrlPattern);
    });
  });
});
