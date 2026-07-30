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

describe('Medication e2e test', () => {
  const medicationPageUrl = '/medication';
  const medicationPageUrlPattern = new RegExp('/medication(\\?.*)?$');
  let username: string;
  let password: string;
  const medicationSample = {};

  let medication;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/services/professionalservice/api/medications+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/professionalservice/api/medications').as('postEntityRequest');
    cy.intercept('DELETE', '/services/professionalservice/api/medications/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (medication) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/professionalservice/api/medications/${medication.id}`,
      }).then(() => {
        medication = undefined;
      });
    }
  });

  it('Medications menu should load Medications page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('medication');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Medication').should('exist');
    cy.url().should('match', medicationPageUrlPattern);
  });

  describe('Medication page', () => {
    it('should have translated page title', () => {
      cy.visit(medicationPageUrl);
      cy.getEntityHeading('Medication').should('not.contain', 'professionalDashboardApp.professionalServiceMedication.home.title');
    });

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
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', medicationPageUrlPattern);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/services/professionalservice/api/medications',
          body: medicationSample,
        }).then(({ body }) => {
          medication = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/professionalservice/api/medications+(?*|)',
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
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', medicationPageUrlPattern);
      });

      it('edit button click should load edit Medication page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Medication');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', medicationPageUrlPattern);
      });

      it('edit button click should load edit Medication page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Medication');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', medicationPageUrlPattern);
      });

      it('last delete button click should delete instance of Medication', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('medication').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', medicationPageUrlPattern);

        medication = undefined;
      });
    });
  });

  describe('new Medication page', () => {
    beforeEach(() => {
      cy.visit(medicationPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Medication');
    });

    it('should create an instance of Medication', () => {
      cy.get(`[data-cy="name"]`).type('utter venom what');
      cy.get(`[data-cy="name"]`).should('have.value', 'utter venom what');

      cy.get(`[data-cy="description"]`).type('restfully');
      cy.get(`[data-cy="description"]`).should('have.value', 'restfully');

      cy.get(`[data-cy="prescription"]`).type('supportive innocently');
      cy.get(`[data-cy="prescription"]`).should('have.value', 'supportive innocently');

      cy.get(`[data-cy="createdDate"]`).type('2024-02-06');
      cy.get(`[data-cy="createdDate"]`).blur();
      cy.get(`[data-cy="createdDate"]`).should('have.value', '2024-02-06');

      cy.get(`[data-cy="modifiedDate"]`).type('2024-02-06');
      cy.get(`[data-cy="modifiedDate"]`).blur();
      cy.get(`[data-cy="modifiedDate"]`).should('have.value', '2024-02-06');

      cy.get(`[data-cy="createdBy"]`).type('which actual accompany');
      cy.get(`[data-cy="createdBy"]`).should('have.value', 'which actual accompany');

      cy.get(`[data-cy="modifiedBy"]`).type('however boo turret');
      cy.get(`[data-cy="modifiedBy"]`).should('have.value', 'however boo turret');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        medication = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.url().should('match', medicationPageUrlPattern);
    });
  });
});
