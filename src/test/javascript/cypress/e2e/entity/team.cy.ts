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

describe('Team e2e test', () => {
  const teamPageUrl = '/team';
  const teamPageUrlPattern = new RegExp('/team(\\?.*)?$');
  let username: string;
  let password: string;
  const teamSample = {};

  let team;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/services/professionalservice/api/teams+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/professionalservice/api/teams').as('postEntityRequest');
    cy.intercept('DELETE', '/services/professionalservice/api/teams/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (team) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/professionalservice/api/teams/${team.id}`,
      }).then(() => {
        team = undefined;
      });
    }
  });

  it('Teams menu should load Teams page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('team');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Team').should('exist');
    cy.url().should('match', teamPageUrlPattern);
  });

  describe('Team page', () => {
    it('should have translated page title', () => {
      cy.visit(teamPageUrl);
      cy.getEntityHeading('Team').should('not.contain', 'professionalDashboardApp.professionalServiceTeam.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(teamPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create Team page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.url().should('match', new RegExp('/team/new$'));
        cy.getEntityCreateUpdateHeading('Team');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', teamPageUrlPattern);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/services/professionalservice/api/teams',
          body: teamSample,
        }).then(({ body }) => {
          team = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/professionalservice/api/teams+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [team],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(teamPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details Team page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('team');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', teamPageUrlPattern);
      });

      it('edit button click should load edit Team page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Team');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', teamPageUrlPattern);
      });

      it('edit button click should load edit Team page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Team');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', teamPageUrlPattern);
      });

      it('last delete button click should delete instance of Team', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('team').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', teamPageUrlPattern);

        team = undefined;
      });
    });
  });

  describe('new Team page', () => {
    beforeEach(() => {
      cy.visit(teamPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Team');
    });

    it('should create an instance of Team', () => {
      cy.get(`[data-cy="name"]`).type('vol shrill');
      cy.get(`[data-cy="name"]`).should('have.value', 'vol shrill');

      cy.get(`[data-cy="description"]`).type('hence');
      cy.get(`[data-cy="description"]`).should('have.value', 'hence');

      cy.get(`[data-cy="contact"]`).type('which babyish insert');
      cy.get(`[data-cy="contact"]`).should('have.value', 'which babyish insert');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        team = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.url().should('match', teamPageUrlPattern);
    });
  });
});
