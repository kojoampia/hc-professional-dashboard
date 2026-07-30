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

describe('HealthConnectProfessional e2e test', () => {
  const healthConnectProfessionalPageUrl = '/health-connect-professional';
  const healthConnectProfessionalPageUrlPattern = new RegExp('/health-connect-professional(\\?.*)?$');
  let username: string;
  let password: string;
  const healthConnectProfessionalSample = {};

  let healthConnectProfessional;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/services/professionalservice/api/health-connect-professionals+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/professionalservice/api/health-connect-professionals').as('postEntityRequest');
    cy.intercept('DELETE', '/services/professionalservice/api/health-connect-professionals/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (healthConnectProfessional) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/professionalservice/api/health-connect-professionals/${healthConnectProfessional.id}`,
      }).then(() => {
        healthConnectProfessional = undefined;
      });
    }
  });

  it('HealthConnectProfessionals menu should load HealthConnectProfessionals page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('health-connect-professional');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('HealthConnectProfessional').should('exist');
    cy.url().should('match', healthConnectProfessionalPageUrlPattern);
  });

  describe('HealthConnectProfessional page', () => {
    it('should have translated page title', () => {
      cy.visit(healthConnectProfessionalPageUrl);
      cy.getEntityHeading('HealthConnectProfessional').should(
        'not.contain',
        'professionalDashboardApp.professionalServiceHealthConnectProfessional.home.title',
      );
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(healthConnectProfessionalPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create HealthConnectProfessional page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.url().should('match', new RegExp('/health-connect-professional/new$'));
        cy.getEntityCreateUpdateHeading('HealthConnectProfessional');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', healthConnectProfessionalPageUrlPattern);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/services/professionalservice/api/health-connect-professionals',
          body: healthConnectProfessionalSample,
        }).then(({ body }) => {
          healthConnectProfessional = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/professionalservice/api/health-connect-professionals+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [healthConnectProfessional],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(healthConnectProfessionalPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details HealthConnectProfessional page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('healthConnectProfessional');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', healthConnectProfessionalPageUrlPattern);
      });

      it('edit button click should load edit HealthConnectProfessional page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('HealthConnectProfessional');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', healthConnectProfessionalPageUrlPattern);
      });

      it('edit button click should load edit HealthConnectProfessional page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('HealthConnectProfessional');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', healthConnectProfessionalPageUrlPattern);
      });

      it('last delete button click should delete instance of HealthConnectProfessional', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('healthConnectProfessional').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', healthConnectProfessionalPageUrlPattern);

        healthConnectProfessional = undefined;
      });
    });
  });

  describe('new HealthConnectProfessional page', () => {
    beforeEach(() => {
      cy.visit(healthConnectProfessionalPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('HealthConnectProfessional');
    });

    it('should create an instance of HealthConnectProfessional', () => {
      cy.get(`[data-cy="accountLogin"]`).type('submissive');
      cy.get(`[data-cy="accountLogin"]`).should('have.value', 'submissive');

      cy.get(`[data-cy="name"]`).type('smuggle intently jagged');
      cy.get(`[data-cy="name"]`).should('have.value', 'smuggle intently jagged');

      cy.get(`[data-cy="role"]`).type('smooth as gosh');
      cy.get(`[data-cy="role"]`).should('have.value', 'smooth as gosh');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        healthConnectProfessional = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.url().should('match', healthConnectProfessionalPageUrlPattern);
    });
  });
});
