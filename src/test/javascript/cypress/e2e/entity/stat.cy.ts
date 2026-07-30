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

describe('Stat e2e test', () => {
  const statPageUrl = '/stat';
  const statPageUrlPattern = new RegExp('/stat(\\?.*)?$');
  let username: string;
  let password: string;
  const statSample = {};

  let stat;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/services/professionalservice/api/stats+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/professionalservice/api/stats').as('postEntityRequest');
    cy.intercept('DELETE', '/services/professionalservice/api/stats/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (stat) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/professionalservice/api/stats/${stat.id}`,
      }).then(() => {
        stat = undefined;
      });
    }
  });

  it('Stats menu should load Stats page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('stat');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Stat').should('exist');
    cy.url().should('match', statPageUrlPattern);
  });

  describe('Stat page', () => {
    it('should have translated page title', () => {
      cy.visit(statPageUrl);
      cy.getEntityHeading('Stat').should('not.contain', 'professionalDashboardApp.professionalServiceStat.home.title');
    });

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
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', statPageUrlPattern);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/services/professionalservice/api/stats',
          body: statSample,
        }).then(({ body }) => {
          stat = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/professionalservice/api/stats+(?*|)',
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
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', statPageUrlPattern);
      });

      it('edit button click should load edit Stat page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Stat');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', statPageUrlPattern);
      });

      it('edit button click should load edit Stat page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Stat');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', statPageUrlPattern);
      });

      it('last delete button click should delete instance of Stat', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('stat').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', statPageUrlPattern);

        stat = undefined;
      });
    });
  });

  describe('new Stat page', () => {
    beforeEach(() => {
      cy.visit(statPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Stat');
    });

    it('should create an instance of Stat', () => {
      cy.get(`[data-cy="type"]`).type('deduct or');
      cy.get(`[data-cy="type"]`).should('have.value', 'deduct or');

      cy.get(`[data-cy="name"]`).type('hurtful');
      cy.get(`[data-cy="name"]`).should('have.value', 'hurtful');

      cy.get(`[data-cy="description"]`).type('whenever mid under');
      cy.get(`[data-cy="description"]`).should('have.value', 'whenever mid under');

      cy.get(`[data-cy="value"]`).type('27272.3');
      cy.get(`[data-cy="value"]`).should('have.value', '27272.3');

      cy.get(`[data-cy="note"]`).type('past reassuringly inquisitively');
      cy.get(`[data-cy="note"]`).should('have.value', 'past reassuringly inquisitively');

      cy.get(`[data-cy="createdDate"]`).type('2024-02-06');
      cy.get(`[data-cy="createdDate"]`).blur();
      cy.get(`[data-cy="createdDate"]`).should('have.value', '2024-02-06');

      cy.get(`[data-cy="createdBy"]`).type('unkempt');
      cy.get(`[data-cy="createdBy"]`).should('have.value', 'unkempt');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        stat = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.url().should('match', statPageUrlPattern);
    });
  });
});
