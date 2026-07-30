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

describe('Profile e2e test', () => {
  const profilePageUrl = '/profile';
  const profilePageUrlPattern = new RegExp('/profile(\\?.*)?$');
  let username: string;
  let password: string;
  const profileSample = {};

  let profile;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/services/professionalservice/api/profiles+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/professionalservice/api/profiles').as('postEntityRequest');
    cy.intercept('DELETE', '/services/professionalservice/api/profiles/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (profile) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/professionalservice/api/profiles/${profile.id}`,
      }).then(() => {
        profile = undefined;
      });
    }
  });

  it('Profiles menu should load Profiles page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('profile');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Profile').should('exist');
    cy.url().should('match', profilePageUrlPattern);
  });

  describe('Profile page', () => {
    it('should have translated page title', () => {
      cy.visit(profilePageUrl);
      cy.getEntityHeading('Profile').should('not.contain', 'professionalDashboardApp.professionalServiceProfile.home.title');
    });

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
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', profilePageUrlPattern);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/services/professionalservice/api/profiles',
          body: profileSample,
        }).then(({ body }) => {
          profile = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/professionalservice/api/profiles+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              headers: {
                link: '<http://localhost/services/professionalservice/api/profiles?page=0&size=20>; rel="last",<http://localhost/services/professionalservice/api/profiles?page=0&size=20>; rel="first"',
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
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', profilePageUrlPattern);
      });

      it('edit button click should load edit Profile page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Profile');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', profilePageUrlPattern);
      });

      it('edit button click should load edit Profile page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Profile');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', profilePageUrlPattern);
      });

      it('last delete button click should delete instance of Profile', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('profile').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', profilePageUrlPattern);

        profile = undefined;
      });
    });
  });

  describe('new Profile page', () => {
    beforeEach(() => {
      cy.visit(profilePageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Profile');
    });

    it('should create an instance of Profile', () => {
      cy.get(`[data-cy="firstName"]`).type('Christy');
      cy.get(`[data-cy="firstName"]`).should('have.value', 'Christy');

      cy.get(`[data-cy="middleNames"]`).type('metal');
      cy.get(`[data-cy="middleNames"]`).should('have.value', 'metal');

      cy.get(`[data-cy="lastName"]`).type('Blick');
      cy.get(`[data-cy="lastName"]`).should('have.value', 'Blick');

      cy.get(`[data-cy="team"]`).type('failing gum');
      cy.get(`[data-cy="team"]`).should('have.value', 'failing gum');

      cy.get(`[data-cy="birthDate"]`).type('2024-02-06');
      cy.get(`[data-cy="birthDate"]`).blur();
      cy.get(`[data-cy="birthDate"]`).should('have.value', '2024-02-06');

      cy.get(`[data-cy="sex"]`).type('um boo after');
      cy.get(`[data-cy="sex"]`).should('have.value', 'um boo after');

      cy.get(`[data-cy="mobilePhone"]`).type('which personalise');
      cy.get(`[data-cy="mobilePhone"]`).should('have.value', 'which personalise');

      cy.get(`[data-cy="phoneNumber"]`).type('besides courageously elegantly');
      cy.get(`[data-cy="phoneNumber"]`).should('have.value', 'besides courageously elegantly');

      cy.get(`[data-cy="email"]`).type('Ceasar_Denesik@yahoo.com');
      cy.get(`[data-cy="email"]`).should('have.value', 'Ceasar_Denesik@yahoo.com');

      cy.get(`[data-cy="idType"]`).type('inasmuch for');
      cy.get(`[data-cy="idType"]`).should('have.value', 'inasmuch for');

      cy.get(`[data-cy="idNumber"]`).type('axe');
      cy.get(`[data-cy="idNumber"]`).should('have.value', 'axe');

      cy.get(`[data-cy="documents"]`).type('screw criminal');
      cy.get(`[data-cy="documents"]`).should('have.value', 'screw criminal');

      cy.get(`[data-cy="address"]`).type('tenement');
      cy.get(`[data-cy="address"]`).should('have.value', 'tenement');

      cy.get(`[data-cy="bankAccount"]`).type('less');
      cy.get(`[data-cy="bankAccount"]`).should('have.value', 'less');

      cy.get(`[data-cy="tenantId"]`).type('majestically phew scrutinise');
      cy.get(`[data-cy="tenantId"]`).should('have.value', 'majestically phew scrutinise');

      cy.get(`[data-cy="rosterId"]`).type('questioningly mindless');
      cy.get(`[data-cy="rosterId"]`).should('have.value', 'questioningly mindless');

      cy.get(`[data-cy="teamId"]`).type('crossly in');
      cy.get(`[data-cy="teamId"]`).should('have.value', 'crossly in');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        profile = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.url().should('match', profilePageUrlPattern);
    });
  });
});
