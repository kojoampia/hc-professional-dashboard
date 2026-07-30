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

describe('Recommendation e2e test', () => {
  const recommendationPageUrl = '/recommendation';
  const recommendationPageUrlPattern = new RegExp('/recommendation(\\?.*)?$');
  let username: string;
  let password: string;
  const recommendationSample = {};

  let recommendation;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/services/patientservice/api/recommendations+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/patientservice/api/recommendations').as('postEntityRequest');
    cy.intercept('DELETE', '/services/patientservice/api/recommendations/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (recommendation) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/patientservice/api/recommendations/${recommendation.id}`,
      }).then(() => {
        recommendation = undefined;
      });
    }
  });

  it('Recommendations menu should load Recommendations page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('recommendation');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Recommendation').should('exist');
    cy.url().should('match', recommendationPageUrlPattern);
  });

  describe('Recommendation page', () => {
    it('should have translated page title', () => {
      cy.visit(recommendationPageUrl);
      cy.getEntityHeading('Recommendation').should('not.contain', 'professionalDashboardApp.patientServiceRecommendation.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(recommendationPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create Recommendation page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.url().should('match', new RegExp('/recommendation/new$'));
        cy.getEntityCreateUpdateHeading('Recommendation');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', recommendationPageUrlPattern);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/services/patientservice/api/recommendations',
          body: recommendationSample,
        }).then(({ body }) => {
          recommendation = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/patientservice/api/recommendations+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [recommendation],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(recommendationPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details Recommendation page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('recommendation');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', recommendationPageUrlPattern);
      });

      it('edit button click should load edit Recommendation page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Recommendation');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', recommendationPageUrlPattern);
      });

      it('edit button click should load edit Recommendation page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Recommendation');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', recommendationPageUrlPattern);
      });

      it('last delete button click should delete instance of Recommendation', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('recommendation').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', recommendationPageUrlPattern);

        recommendation = undefined;
      });
    });
  });

  describe('new Recommendation page', () => {
    beforeEach(() => {
      cy.visit(recommendationPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Recommendation');
    });

    it('should create an instance of Recommendation', () => {
      cy.get(`[data-cy="label"]`).type('boohoo mask');
      cy.get(`[data-cy="label"]`).should('have.value', 'boohoo mask');

      cy.get(`[data-cy="category"]`).type('quickly deck round');
      cy.get(`[data-cy="category"]`).should('have.value', 'quickly deck round');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        recommendation = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.url().should('match', recommendationPageUrlPattern);
    });
  });
});
