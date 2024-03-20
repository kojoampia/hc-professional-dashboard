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

describe('Stat e2e test', () => {
  const statPageUrl = '/stat';
  const statPageUrlPattern = new RegExp('/stat(\\?.*)?$');
  const username = Cypress.env('E2E_USERNAME') ?? 'user';
  const password = Cypress.env('E2E_PASSWORD') ?? 'user';
  const statSample = {};

  let stat;

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/services/professionalms/api/stats+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/professionalms/api/stats').as('postEntityRequest');
    cy.intercept('DELETE', '/services/professionalms/api/stats/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (stat) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/professionalms/api/stats/${stat.id}`,
      }).then(() => {
        stat = undefined;
      });
    }
  });

  it('Stats menu should load Stats page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('stat');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Stat').should('exist');
    cy.url().should('match', statPageUrlPattern);
  });

  describe('Stat page', () => {
    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(statPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create Stat page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.url().should('match', new RegExp('/stat/new$'));
        cy.getEntityCreateUpdateHeading('Stat');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', statPageUrlPattern);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/services/professionalms/api/stats',
          body: statSample,
        }).then(({ body }) => {
          stat = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/professionalms/api/stats+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [stat],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(statPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details Stat page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('stat');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', statPageUrlPattern);
      });

      it('edit button click should load edit Stat page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Stat');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', statPageUrlPattern);
      });

      it('edit button click should load edit Stat page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Stat');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', statPageUrlPattern);
      });

      it('last delete button click should delete instance of Stat', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('stat').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', statPageUrlPattern);

        stat = undefined;
      });
    });
  });

  describe('new Stat page', () => {
    beforeEach(() => {
      cy.visit(`${statPageUrl}`);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Stat');
    });

    it('should create an instance of Stat', () => {
      cy.get(`[data-cy="name"]`).type('colorful county inasmuch');
      cy.get(`[data-cy="name"]`).should('have.value', 'colorful county inasmuch');

      cy.get(`[data-cy="description"]`).type('questionably yellow');
      cy.get(`[data-cy="description"]`).should('have.value', 'questionably yellow');

      cy.get(`[data-cy="value"]`).type('9714.2');
      cy.get(`[data-cy="value"]`).should('have.value', '9714.2');

      cy.get(`[data-cy="note"]`).type('opposite outside demoralise');
      cy.get(`[data-cy="note"]`).should('have.value', 'opposite outside demoralise');

      cy.get(`[data-cy="createdDate"]`).type('2024-02-06');
      cy.get(`[data-cy="createdDate"]`).blur();
      cy.get(`[data-cy="createdDate"]`).should('have.value', '2024-02-06');

      cy.get(`[data-cy="createdBy"]`).type('um gee');
      cy.get(`[data-cy="createdBy"]`).should('have.value', 'um gee');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response.statusCode).to.equal(201);
        stat = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response.statusCode).to.equal(200);
      });
      cy.url().should('match', statPageUrlPattern);
    });
  });
});
