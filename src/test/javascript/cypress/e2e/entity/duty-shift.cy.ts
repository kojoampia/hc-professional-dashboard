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

describe('DutyShift e2e test', () => {
  const dutyShiftPageUrl = '/duty-shift';
  const dutyShiftPageUrlPattern = new RegExp('/duty-shift(\\?.*)?$');
  let username: string;
  let password: string;
  const dutyShiftSample = {};

  let dutyShift;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/services/professionalservice/api/duty-shifts+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/professionalservice/api/duty-shifts').as('postEntityRequest');
    cy.intercept('DELETE', '/services/professionalservice/api/duty-shifts/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (dutyShift) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/professionalservice/api/duty-shifts/${dutyShift.id}`,
      }).then(() => {
        dutyShift = undefined;
      });
    }
  });

  it('DutyShifts menu should load DutyShifts page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('duty-shift');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('DutyShift').should('exist');
    cy.url().should('match', dutyShiftPageUrlPattern);
  });

  describe('DutyShift page', () => {
    it('should have translated page title', () => {
      cy.visit(dutyShiftPageUrl);
      cy.getEntityHeading('DutyShift').should('not.contain', 'professionalDashboardApp.professionalServiceDutyShift.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(dutyShiftPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create DutyShift page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.url().should('match', new RegExp('/duty-shift/new$'));
        cy.getEntityCreateUpdateHeading('DutyShift');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', dutyShiftPageUrlPattern);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/services/professionalservice/api/duty-shifts',
          body: dutyShiftSample,
        }).then(({ body }) => {
          dutyShift = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/professionalservice/api/duty-shifts+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [dutyShift],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(dutyShiftPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details DutyShift page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('dutyShift');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', dutyShiftPageUrlPattern);
      });

      it('edit button click should load edit DutyShift page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('DutyShift');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', dutyShiftPageUrlPattern);
      });

      it('edit button click should load edit DutyShift page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('DutyShift');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', dutyShiftPageUrlPattern);
      });

      it('last delete button click should delete instance of DutyShift', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('dutyShift').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', dutyShiftPageUrlPattern);

        dutyShift = undefined;
      });
    });
  });

  describe('new DutyShift page', () => {
    beforeEach(() => {
      cy.visit(dutyShiftPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('DutyShift');
    });

    it('should create an instance of DutyShift', () => {
      cy.get(`[data-cy="professionalId"]`).type('outside');
      cy.get(`[data-cy="professionalId"]`).should('have.value', 'outside');

      cy.get(`[data-cy="startsAt"]`).type('2026-07-24T04:01');
      cy.get(`[data-cy="startsAt"]`).blur();
      cy.get(`[data-cy="startsAt"]`).should('have.value', '2026-07-24T04:01');

      cy.get(`[data-cy="endsAt"]`).type('2026-07-24T02:35');
      cy.get(`[data-cy="endsAt"]`).blur();
      cy.get(`[data-cy="endsAt"]`).should('have.value', '2026-07-24T02:35');

      cy.get(`[data-cy="status"]`).select('UPCOMING');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        dutyShift = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.url().should('match', dutyShiftPageUrlPattern);
    });
  });
});
