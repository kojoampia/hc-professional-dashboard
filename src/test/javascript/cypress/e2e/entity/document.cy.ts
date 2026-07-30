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

describe('Document e2e test', () => {
  const documentPageUrl = '/document';
  const documentPageUrlPattern = new RegExp('/document(\\?.*)?$');
  let username: string;
  let password: string;
  const documentSample = {};

  let document;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/services/professionalservice/api/documents+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/professionalservice/api/documents').as('postEntityRequest');
    cy.intercept('DELETE', '/services/professionalservice/api/documents/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (document) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/professionalservice/api/documents/${document.id}`,
      }).then(() => {
        document = undefined;
      });
    }
  });

  it('Documents menu should load Documents page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('document');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Document').should('exist');
    cy.url().should('match', documentPageUrlPattern);
  });

  describe('Document page', () => {
    it('should have translated page title', () => {
      cy.visit(documentPageUrl);
      cy.getEntityHeading('Document').should('not.contain', 'professionalDashboardApp.professionalServiceDocument.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(documentPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create Document page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.url().should('match', new RegExp('/document/new$'));
        cy.getEntityCreateUpdateHeading('Document');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', documentPageUrlPattern);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/services/professionalservice/api/documents',
          body: documentSample,
        }).then(({ body }) => {
          document = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/professionalservice/api/documents+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [document],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(documentPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details Document page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('document');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', documentPageUrlPattern);
      });

      it('edit button click should load edit Document page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Document');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', documentPageUrlPattern);
      });

      it('edit button click should load edit Document page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Document');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', documentPageUrlPattern);
      });

      it('last delete button click should delete instance of Document', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('document').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', documentPageUrlPattern);

        document = undefined;
      });
    });
  });

  describe('new Document page', () => {
    beforeEach(() => {
      cy.visit(documentPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Document');
    });

    it('should create an instance of Document', () => {
      cy.get(`[data-cy="name"]`).type('below follower');
      cy.get(`[data-cy="name"]`).should('have.value', 'below follower');

      cy.get(`[data-cy="profileId"]`).type('availability chunder');
      cy.get(`[data-cy="profileId"]`).should('have.value', 'availability chunder');

      cy.setFieldImageAsBytesOfEntity('data', 'integration-test.png', 'image/png');

      cy.get(`[data-cy="type"]`).select('LICENSE');

      cy.get(`[data-cy="createdDate"]`).type('2024-03-20');
      cy.get(`[data-cy="createdDate"]`).blur();
      cy.get(`[data-cy="createdDate"]`).should('have.value', '2024-03-20');

      cy.get(`[data-cy="modifiedDate"]`).type('2024-03-20');
      cy.get(`[data-cy="modifiedDate"]`).blur();
      cy.get(`[data-cy="modifiedDate"]`).should('have.value', '2024-03-20');

      cy.get(`[data-cy="createdBy"]`).type('within');
      cy.get(`[data-cy="createdBy"]`).should('have.value', 'within');

      cy.get(`[data-cy="modifiedBy"]`).type('fumigate');
      cy.get(`[data-cy="modifiedBy"]`).should('have.value', 'fumigate');

      // since cypress clicks submit too fast before the blob fields are validated
      cy.wait(200); // eslint-disable-line cypress/no-unnecessary-waiting
      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        document = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.url().should('match', documentPageUrlPattern);
    });
  });
});
