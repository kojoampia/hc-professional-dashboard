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

describe('MedCase e2e test', () => {
  const medCasePageUrl = '/med-case';
  const medCasePageUrlPattern = new RegExp('/med-case(\\?.*)?$');
  let username: string;
  let password: string;
  const medCaseSample = {};

  let medCase;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/services/hcpatientservice/api/med-cases+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/hcpatientservice/api/med-cases').as('postEntityRequest');
    cy.intercept('DELETE', '/services/hcpatientservice/api/med-cases/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (medCase) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/hcpatientservice/api/med-cases/${medCase.id}`,
      }).then(() => {
        medCase = undefined;
      });
    }
  });

  it('MedCases menu should load MedCases page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('med-case');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('MedCase').should('exist');
    cy.url().should('match', medCasePageUrlPattern);
  });

  describe('MedCase page', () => {
    it('should have translated page title', () => {
      cy.visit(medCasePageUrl);
      cy.getEntityHeading('MedCase').should('not.contain', 'professionalDashboardApp.hcPatientServiceMedCase.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(medCasePageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create MedCase page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.url().should('match', new RegExp('/med-case/new$'));
        cy.getEntityCreateUpdateHeading('MedCase');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', medCasePageUrlPattern);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/services/hcpatientservice/api/med-cases',
          body: medCaseSample,
        }).then(({ body }) => {
          medCase = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/hcpatientservice/api/med-cases+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              headers: {
                link: '<http://localhost/services/hcpatientservice/api/med-cases?page=0&size=20>; rel="last",<http://localhost/services/hcpatientservice/api/med-cases?page=0&size=20>; rel="first"',
              },
              body: [medCase],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(medCasePageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details MedCase page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('medCase');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', medCasePageUrlPattern);
      });

      it('edit button click should load edit MedCase page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('MedCase');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', medCasePageUrlPattern);
      });

      it('edit button click should load edit MedCase page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('MedCase');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', medCasePageUrlPattern);
      });

      it('last delete button click should delete instance of MedCase', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('medCase').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', medCasePageUrlPattern);

        medCase = undefined;
      });
    });
  });

  describe('new MedCase page', () => {
    beforeEach(() => {
      cy.visit(medCasePageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('MedCase');
    });

    it('should create an instance of MedCase', () => {
      cy.get(`[data-cy="symptoms"]`).type('provided phew watery');
      cy.get(`[data-cy="symptoms"]`).should('have.value', 'provided phew watery');

      cy.get(`[data-cy="diagnoses"]`).type('yuppify');
      cy.get(`[data-cy="diagnoses"]`).should('have.value', 'yuppify');

      cy.get(`[data-cy="recommendations"]`).type('curiously pish tag');
      cy.get(`[data-cy="recommendations"]`).should('have.value', 'curiously pish tag');

      cy.get(`[data-cy="createdDate"]`).type('2026-07-20T11:51');
      cy.get(`[data-cy="createdDate"]`).blur();
      cy.get(`[data-cy="createdDate"]`).should('have.value', '2026-07-20T11:51');

      cy.get(`[data-cy="createdBy"]`).type('boo at');
      cy.get(`[data-cy="createdBy"]`).should('have.value', 'boo at');

      cy.get(`[data-cy="modifiedDate"]`).type('2026-07-20T10:33');
      cy.get(`[data-cy="modifiedDate"]`).blur();
      cy.get(`[data-cy="modifiedDate"]`).should('have.value', '2026-07-20T10:33');

      cy.get(`[data-cy="modifiedBy"]`).type('whoever wing');
      cy.get(`[data-cy="modifiedBy"]`).should('have.value', 'whoever wing');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        medCase = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.url().should('match', medCasePageUrlPattern);
    });
  });
});
