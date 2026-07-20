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
    cy.intercept('GET', '/services/professionalService/api/profiles+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/professionalService/api/profiles').as('postEntityRequest');
    cy.intercept('DELETE', '/services/professionalService/api/profiles/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (profile) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/professionalService/api/profiles/${profile.id}`,
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
          url: '/services/professionalService/api/profiles',
          body: profileSample,
        }).then(({ body }) => {
          profile = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/professionalService/api/profiles+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              headers: {
                link: '<http://localhost/services/professionalService/api/profiles?page=0&size=20>; rel="last",<http://localhost/services/professionalService/api/profiles?page=0&size=20>; rel="first"',
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
      cy.get(`[data-cy="firstName"]`).type('Brandi');
      cy.get(`[data-cy="firstName"]`).should('have.value', 'Brandi');

      cy.get(`[data-cy="middleNames"]`).type('gah given minus');
      cy.get(`[data-cy="middleNames"]`).should('have.value', 'gah given minus');

      cy.get(`[data-cy="lastName"]`).type('Considine');
      cy.get(`[data-cy="lastName"]`).should('have.value', 'Considine');

      cy.get(`[data-cy="membership"]`).type('phooey trustee stir-fry');
      cy.get(`[data-cy="membership"]`).should('have.value', 'phooey trustee stir-fry');

      cy.get(`[data-cy="birthDate"]`).type('2024-02-06');
      cy.get(`[data-cy="birthDate"]`).blur();
      cy.get(`[data-cy="birthDate"]`).should('have.value', '2024-02-06');

      cy.get(`[data-cy="sex"]`).type('jovially unimpressively');
      cy.get(`[data-cy="sex"]`).should('have.value', 'jovially unimpressively');

      cy.get(`[data-cy="mobilePhone"]`).type('titivate rigidly after');
      cy.get(`[data-cy="mobilePhone"]`).should('have.value', 'titivate rigidly after');

      cy.get(`[data-cy="phoneNumber"]`).type('monocle');
      cy.get(`[data-cy="phoneNumber"]`).should('have.value', 'monocle');

      cy.get(`[data-cy="email"]`).type('Jeramie.Schowalter@gmail.com');
      cy.get(`[data-cy="email"]`).should('have.value', 'Jeramie.Schowalter@gmail.com');

      cy.get(`[data-cy="cardType"]`).type('census simulcast shred');
      cy.get(`[data-cy="cardType"]`).should('have.value', 'census simulcast shred');

      cy.get(`[data-cy="cardNumber"]`).type('strange what brr');
      cy.get(`[data-cy="cardNumber"]`).should('have.value', 'strange what brr');

      cy.get(`[data-cy="contacts"]`).type('inside formicarium why');
      cy.get(`[data-cy="contacts"]`).should('have.value', 'inside formicarium why');

      cy.get(`[data-cy="address"]`).type('aboard');
      cy.get(`[data-cy="address"]`).should('have.value', 'aboard');

      cy.get(`[data-cy="team"]`).type('knottily wisely');
      cy.get(`[data-cy="team"]`).should('have.value', 'knottily wisely');

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
