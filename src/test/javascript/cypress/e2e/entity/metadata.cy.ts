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

describe('Metadata e2e test', () => {
  const metadataPageUrl = '/metadata';
  const metadataPageUrlPattern = new RegExp('/metadata(\\?.*)?$');
  let username: string;
  let password: string;
  const metadataSample = {};

  let metadata;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/services/professionalservice/api/metadata+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/professionalservice/api/metadata').as('postEntityRequest');
    cy.intercept('DELETE', '/services/professionalservice/api/metadata/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (metadata) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/professionalservice/api/metadata/${metadata.id}`,
      }).then(() => {
        metadata = undefined;
      });
    }
  });

  it('Metadatas menu should load Metadatas page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('metadata');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Metadata').should('exist');
    cy.url().should('match', metadataPageUrlPattern);
  });

  describe('Metadata page', () => {
    it('should have translated page title', () => {
      cy.visit(metadataPageUrl);
      cy.getEntityHeading('Metadata').should('not.contain', 'professionalDashboardApp.professionalServiceMetadata.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(metadataPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create Metadata page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.url().should('match', new RegExp('/metadata/new$'));
        cy.getEntityCreateUpdateHeading('Metadata');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', metadataPageUrlPattern);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/services/professionalservice/api/metadata',
          body: metadataSample,
        }).then(({ body }) => {
          metadata = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/professionalservice/api/metadata+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [metadata],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(metadataPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details Metadata page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('metadata');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', metadataPageUrlPattern);
      });

      it('edit button click should load edit Metadata page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Metadata');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', metadataPageUrlPattern);
      });

      it('edit button click should load edit Metadata page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Metadata');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', metadataPageUrlPattern);
      });

      it('last delete button click should delete instance of Metadata', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('metadata').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', metadataPageUrlPattern);

        metadata = undefined;
      });
    });
  });

  describe('new Metadata page', () => {
    beforeEach(() => {
      cy.visit(metadataPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Metadata');
    });

    it('should create an instance of Metadata', () => {
      cy.get(`[data-cy="createdBy"]`).type('veto');
      cy.get(`[data-cy="createdBy"]`).should('have.value', 'veto');

      cy.get(`[data-cy="modifiedBy"]`).type('slide er unnecessarily');
      cy.get(`[data-cy="modifiedBy"]`).should('have.value', 'slide er unnecessarily');

      cy.get(`[data-cy="createdDate"]`).type('2024-02-06');
      cy.get(`[data-cy="createdDate"]`).blur();
      cy.get(`[data-cy="createdDate"]`).should('have.value', '2024-02-06');

      cy.get(`[data-cy="modifiedDate"]`).type('2024-02-06');
      cy.get(`[data-cy="modifiedDate"]`).blur();
      cy.get(`[data-cy="modifiedDate"]`).should('have.value', '2024-02-06');

      cy.get(`[data-cy="data"]`).type('hepatitis');
      cy.get(`[data-cy="data"]`).should('have.value', 'hepatitis');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        metadata = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.url().should('match', metadataPageUrlPattern);
    });
  });
});
