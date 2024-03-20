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

describe('Profile e2e test', () => {
  const profilePageUrl = '/profile';
  const profilePageUrlPattern = new RegExp('/profile(\\?.*)?$');
  const username = Cypress.env('E2E_USERNAME') ?? 'user';
  const password = Cypress.env('E2E_PASSWORD') ?? 'user';
  const profileSample = {};

  let profile;

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/services/professionalms/api/profiles+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/professionalms/api/profiles').as('postEntityRequest');
    cy.intercept('DELETE', '/services/professionalms/api/profiles/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (profile) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/professionalms/api/profiles/${profile.id}`,
      }).then(() => {
        profile = undefined;
      });
    }
  });

  it('Profiles menu should load Profiles page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('profile');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Profile').should('exist');
    cy.url().should('match', profilePageUrlPattern);
  });

  describe('Profile page', () => {
    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(profilePageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create Profile page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.url().should('match', new RegExp('/profile/new$'));
        cy.getEntityCreateUpdateHeading('Profile');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', profilePageUrlPattern);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/services/professionalms/api/profiles',
          body: profileSample,
        }).then(({ body }) => {
          profile = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/professionalms/api/profiles+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              headers: {
                link: '<http://localhost/services/professionalms/api/profiles?page=0&size=20>; rel="last",<http://localhost/services/professionalms/api/profiles?page=0&size=20>; rel="first"',
              },
              body: [profile],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(profilePageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details Profile page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('profile');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', profilePageUrlPattern);
      });

      it('edit button click should load edit Profile page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Profile');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', profilePageUrlPattern);
      });

      it('edit button click should load edit Profile page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Profile');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', profilePageUrlPattern);
      });

      it('last delete button click should delete instance of Profile', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('profile').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response.statusCode).to.equal(200);
        });
        cy.url().should('match', profilePageUrlPattern);

        profile = undefined;
      });
    });
  });

  describe('new Profile page', () => {
    beforeEach(() => {
      cy.visit(`${profilePageUrl}`);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Profile');
    });

    it('should create an instance of Profile', () => {
      cy.get(`[data-cy="firstName"]`).type('Paula');
      cy.get(`[data-cy="firstName"]`).should('have.value', 'Paula');

      cy.get(`[data-cy="middleNames"]`).type('palatable');
      cy.get(`[data-cy="middleNames"]`).should('have.value', 'palatable');

      cy.get(`[data-cy="lastName"]`).type('Crist');
      cy.get(`[data-cy="lastName"]`).should('have.value', 'Crist');

      cy.get(`[data-cy="membership"]`).type('yahoo');
      cy.get(`[data-cy="membership"]`).should('have.value', 'yahoo');

      cy.get(`[data-cy="birthDate"]`).type('2024-02-06');
      cy.get(`[data-cy="birthDate"]`).blur();
      cy.get(`[data-cy="birthDate"]`).should('have.value', '2024-02-06');

      cy.get(`[data-cy="sex"]`).type('sturdy elegantly beyond');
      cy.get(`[data-cy="sex"]`).should('have.value', 'sturdy elegantly beyond');

      cy.get(`[data-cy="mobilePhone"]`).type('whereas plus');
      cy.get(`[data-cy="mobilePhone"]`).should('have.value', 'whereas plus');

      cy.get(`[data-cy="phoneNumber"]`).type('gee');
      cy.get(`[data-cy="phoneNumber"]`).should('have.value', 'gee');

      cy.get(`[data-cy="email"]`).type('Anika.Borer@hotmail.com');
      cy.get(`[data-cy="email"]`).should('have.value', 'Anika.Borer@hotmail.com');

      cy.get(`[data-cy="idType"]`).type('what');
      cy.get(`[data-cy="idType"]`).should('have.value', 'what');

      cy.get(`[data-cy="idNumber"]`).type('cuff-link civilisation');
      cy.get(`[data-cy="idNumber"]`).should('have.value', 'cuff-link civilisation');

      cy.get(`[data-cy="contacts"]`).type('miserably after');
      cy.get(`[data-cy="contacts"]`).should('have.value', 'miserably after');

      cy.get(`[data-cy="address"]`).type('dismal stunt acclimatise');
      cy.get(`[data-cy="address"]`).should('have.value', 'dismal stunt acclimatise');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response.statusCode).to.equal(201);
        profile = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response.statusCode).to.equal(200);
      });
      cy.url().should('match', profilePageUrlPattern);
    });
  });
});
