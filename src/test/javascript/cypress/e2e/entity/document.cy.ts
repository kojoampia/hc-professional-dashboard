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

describe('Document e2e test', () => {
  const documentPageUrl = '/document';
  const documentPageUrlPattern = new RegExp('/document(\\?.*)?$');
  const username = Cypress.env('E2E_USERNAME') ?? 'user';
  const password = Cypress.env('E2E_PASSWORD') ?? 'user';
  const documentSample = {};

  let document;

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/services/hcprofessionalService/api/documents+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/hcprofessionalService/api/documents').as('postEntityRequest');
    cy.intercept('DELETE', '/services/hcprofessionalService/api/documents/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (document) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/hcprofessionalService/api/documents/${document.id}`,
      }).then(() => {
        document = undefined;
      });
    }
  });

  it('Documents menu should load Documents page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('document');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Document').should('exist');
    cy.url().should('match', documentPageUrlPattern);
  });

  describe('Document page', () => {
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
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', documentPageUrlPattern);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/services/hcprofessionalService/api/documents',
          body: documentSample,
        }).then(({ body }) => {
          document = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/hcprofessionalService/api/documents+(?*|)',
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
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', documentPageUrlPattern);
      });

      it('edit button click should load edit Document page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Document');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', documentPageUrlPattern);
      });

      it('edit button click should load edit Document page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Document');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', documentPageUrlPattern);
      });

      it('last delete button click should delete instance of Document', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('document').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', documentPageUrlPattern);

        document = undefined;
      });
    });
  });

  describe('new Document page', () => {
    beforeEach(() => {
      cy.visit(`${documentPageUrl}`);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Document');
    });

    it('should create an instance of Document', () => {
      cy.get(`[data-cy="name"]`).type('level even');
      cy.get(`[data-cy="name"]`).should('have.value', 'level even');

      cy.get(`[data-cy="profileId"]`).type('meh before');
      cy.get(`[data-cy="profileId"]`).should('have.value', 'meh before');

      cy.setFieldImageAsBytesOfEntity('data', 'integration-test.png', 'image/png');

      cy.get(`[data-cy="type"]`).select('CERTIFICATE');

      cy.get(`[data-cy="createdDate"]`).type('2024-03-20');
      cy.get(`[data-cy="createdDate"]`).blur();
      cy.get(`[data-cy="createdDate"]`).should('have.value', '2024-03-20');

      cy.get(`[data-cy="modifiedDate"]`).type('2024-03-20');
      cy.get(`[data-cy="modifiedDate"]`).blur();
      cy.get(`[data-cy="modifiedDate"]`).should('have.value', '2024-03-20');

      cy.get(`[data-cy="lastModifiedBy"]`).type('leaven obnoxiously');
      cy.get(`[data-cy="lastModifiedBy"]`).should('have.value', 'leaven obnoxiously');

      // since cypress clicks submit too fast before the blob fields are validated
      cy.wait(200); // eslint-disable-line cypress/no-unnecessary-waiting
      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response.statusCode).to.equal(201);
        document = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response.statusCode).to.equal(200);
      });
      cy.url().should('match', documentPageUrlPattern);
    });
  });
});
