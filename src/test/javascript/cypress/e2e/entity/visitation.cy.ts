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

describe('Visitation e2e test', () => {
  const visitationPageUrl = '/visitation';
  const visitationPageUrlPattern = new RegExp('/visitation(\\?.*)?$');
  let username: string;
  let password: string;
  const visitationSample = {};

  let visitation;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/services/patientservice/api/visitations+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/patientservice/api/visitations').as('postEntityRequest');
    cy.intercept('DELETE', '/services/patientservice/api/visitations/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (visitation) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/patientservice/api/visitations/${visitation.id}`,
      }).then(() => {
        visitation = undefined;
      });
    }
  });

  it('Visitations menu should load Visitations page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('visitation');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Visitation').should('exist');
    cy.url().should('match', visitationPageUrlPattern);
  });

  describe('Visitation page', () => {
    it('should have translated page title', () => {
      cy.visit(visitationPageUrl);
      cy.getEntityHeading('Visitation').should('not.contain', 'professionalDashboardApp.patientServiceVisitation.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(visitationPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create Visitation page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.url().should('match', new RegExp('/visitation/new$'));
        cy.getEntityCreateUpdateHeading('Visitation');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', visitationPageUrlPattern);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/services/patientservice/api/visitations',
          body: visitationSample,
        }).then(({ body }) => {
          visitation = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/patientservice/api/visitations+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [visitation],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(visitationPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details Visitation page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('visitation');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', visitationPageUrlPattern);
      });

      it('edit button click should load edit Visitation page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Visitation');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', visitationPageUrlPattern);
      });

      it('edit button click should load edit Visitation page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Visitation');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', visitationPageUrlPattern);
      });

      it('last delete button click should delete instance of Visitation', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('visitation').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', visitationPageUrlPattern);

        visitation = undefined;
      });
    });
  });

  describe('new Visitation page', () => {
    beforeEach(() => {
      cy.visit(visitationPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Visitation');
    });

    it('should create an instance of Visitation', () => {
      cy.get(`[data-cy="patientId"]`).type('dandelion outlying cautious');
      cy.get(`[data-cy="patientId"]`).should('have.value', 'dandelion outlying cautious');

      cy.get(`[data-cy="occurredAt"]`).type('2026-07-23T14:07');
      cy.get(`[data-cy="occurredAt"]`).blur();
      cy.get(`[data-cy="occurredAt"]`).should('have.value', '2026-07-23T14:07');

      cy.get(`[data-cy="label"]`).type('fledgling');
      cy.get(`[data-cy="label"]`).should('have.value', 'fledgling');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        visitation = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.url().should('match', visitationPageUrlPattern);
    });
  });
});
