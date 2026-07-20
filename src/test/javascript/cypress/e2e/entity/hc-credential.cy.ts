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

describe('HCCredential e2e test', () => {
  const hCCredentialPageUrl = '/hc-credential';
  const hCCredentialPageUrlPattern = new RegExp('/hc-credential(\\?.*)?$');
  const username = Cypress.env('E2E_USERNAME') ?? 'user';
  const password = Cypress.env('E2E_PASSWORD') ?? 'user';
  const hCCredentialSample = {};

  let hCCredential;

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/services/professionalService/api/hc-credentials+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/professionalService/api/hc-credentials').as('postEntityRequest');
    cy.intercept('DELETE', '/services/professionalService/api/hc-credentials/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (hCCredential) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/professionalService/api/hc-credentials/${hCCredential.id}`,
      }).then(() => {
        hCCredential = undefined;
      });
    }
  });

  it('HCCredentials menu should load HCCredentials page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('hc-credential');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('HCCredential').should('exist');
    cy.url().should('match', hCCredentialPageUrlPattern);
  });

  describe('HCCredential page', () => {
    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(hCCredentialPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create HCCredential page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.url().should('match', new RegExp('/hc-credential/new$'));
        cy.getEntityCreateUpdateHeading('HCCredential');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', hCCredentialPageUrlPattern);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/services/professionalService/api/hc-credentials',
          body: hCCredentialSample,
        }).then(({ body }) => {
          hCCredential = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/professionalService/api/hc-credentials+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [hCCredential],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(hCCredentialPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details HCCredential page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('hCCredential');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', hCCredentialPageUrlPattern);
      });

      it('edit button click should load edit HCCredential page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('HCCredential');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', hCCredentialPageUrlPattern);
      });

      it('edit button click should load edit HCCredential page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('HCCredential');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', hCCredentialPageUrlPattern);
      });

      it('last delete button click should delete instance of HCCredential', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('hCCredential').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', hCCredentialPageUrlPattern);

        hCCredential = undefined;
      });
    });
  });

  describe('new HCCredential page', () => {
    beforeEach(() => {
      cy.visit(`${hCCredentialPageUrl}`);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('HCCredential');
    });

    it('should create an instance of HCCredential', () => {
      cy.get(`[data-cy="email"]`).type('Gerhard.Rippin86@yahoo.com');
      cy.get(`[data-cy="email"]`).should('have.value', 'Gerhard.Rippin86@yahoo.com');

      cy.get(`[data-cy="phoneNumber"]`).type('long-term leeway well-off');
      cy.get(`[data-cy="phoneNumber"]`).should('have.value', 'long-term leeway well-off');

      cy.get(`[data-cy="password"]`).type('condemn once');
      cy.get(`[data-cy="password"]`).should('have.value', 'condemn once');

      cy.get(`[data-cy="role"]`).type('unlike');
      cy.get(`[data-cy="role"]`).should('have.value', 'unlike');

      cy.get(`[data-cy="createdDate"]`).type('2024-02-06');
      cy.get(`[data-cy="createdDate"]`).blur();
      cy.get(`[data-cy="createdDate"]`).should('have.value', '2024-02-06');

      cy.get(`[data-cy="active"]`).should('not.be.checked');
      cy.get(`[data-cy="active"]`).click();
      cy.get(`[data-cy="active"]`).should('be.checked');

      cy.get(`[data-cy="modifiedDate"]`).type('2024-02-06');
      cy.get(`[data-cy="modifiedDate"]`).blur();
      cy.get(`[data-cy="modifiedDate"]`).should('have.value', '2024-02-06');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response.statusCode).to.equal(201);
        hCCredential = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response.statusCode).to.equal(200);
      });
      cy.url().should('match', hCCredentialPageUrlPattern);
    });
  });
});
