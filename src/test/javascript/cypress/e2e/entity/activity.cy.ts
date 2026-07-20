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

describe('Activity e2e test', () => {
  const activityPageUrl = '/activity';
  const activityPageUrlPattern = new RegExp('/activity(\\?.*)?$');
  let username: string;
  let password: string;
  const activitySample = {};

  let activity;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/services/hcprofessionalService/api/activities+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/hcprofessionalService/api/activities').as('postEntityRequest');
    cy.intercept('DELETE', '/services/hcprofessionalService/api/activities/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (activity) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/hcprofessionalService/api/activities/${activity.id}`,
      }).then(() => {
        activity = undefined;
      });
    }
  });

  it('Activities menu should load Activities page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('activity');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Activity').should('exist');
    cy.url().should('match', activityPageUrlPattern);
  });

  describe('Activity page', () => {
    it('should have translated page title', () => {
      cy.visit(activityPageUrl);
      cy.getEntityHeading('Activity').should('not.contain', 'professionalDashboardApp.hcprofessionalServiceActivity.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(activityPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create Activity page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.url().should('match', new RegExp('/activity/new$'));
        cy.getEntityCreateUpdateHeading('Activity');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', activityPageUrlPattern);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/services/hcprofessionalService/api/activities',
          body: activitySample,
        }).then(({ body }) => {
          activity = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/hcprofessionalService/api/activities+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [activity],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(activityPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details Activity page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('activity');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', activityPageUrlPattern);
      });

      it('edit button click should load edit Activity page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Activity');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', activityPageUrlPattern);
      });

      it('edit button click should load edit Activity page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Activity');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', activityPageUrlPattern);
      });

      it('last delete button click should delete instance of Activity', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('activity').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', activityPageUrlPattern);

        activity = undefined;
      });
    });
  });

  describe('new Activity page', () => {
    beforeEach(() => {
      cy.visit(activityPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Activity');
    });

    it('should create an instance of Activity', () => {
      cy.get(`[data-cy="name"]`).type('dearly awareness');
      cy.get(`[data-cy="name"]`).should('have.value', 'dearly awareness');

      cy.get(`[data-cy="description"]`).type('palate concerning');
      cy.get(`[data-cy="description"]`).should('have.value', 'palate concerning');

      cy.get(`[data-cy="patientId"]`).type('mushy');
      cy.get(`[data-cy="patientId"]`).should('have.value', 'mushy');

      cy.get(`[data-cy="createdDate"]`).type('2024-03-26T02:33');
      cy.get(`[data-cy="createdDate"]`).blur();
      cy.get(`[data-cy="createdDate"]`).should('have.value', '2024-03-26T02:33');

      cy.get(`[data-cy="createdBy"]`).type('tut woot and');
      cy.get(`[data-cy="createdBy"]`).should('have.value', 'tut woot and');

      cy.get(`[data-cy="modifiedDate"]`).type('2024-03-26T13:32');
      cy.get(`[data-cy="modifiedDate"]`).blur();
      cy.get(`[data-cy="modifiedDate"]`).should('have.value', '2024-03-26T13:32');

      cy.get(`[data-cy="modifiedBy"]`).type('while revitalise');
      cy.get(`[data-cy="modifiedBy"]`).should('have.value', 'while revitalise');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        activity = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.url().should('match', activityPageUrlPattern);
    });
  });
});
