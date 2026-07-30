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

describe('ActivityLogEntry e2e test', () => {
  const activityLogEntryPageUrl = '/activity-log-entry';
  const activityLogEntryPageUrlPattern = new RegExp('/activity-log-entry(\\?.*)?$');
  let username: string;
  let password: string;
  const activityLogEntrySample = {};

  let activityLogEntry;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/services/patientservice/api/activity-log-entries+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/services/patientservice/api/activity-log-entries').as('postEntityRequest');
    cy.intercept('DELETE', '/services/patientservice/api/activity-log-entries/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (activityLogEntry) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/services/patientservice/api/activity-log-entries/${activityLogEntry.id}`,
      }).then(() => {
        activityLogEntry = undefined;
      });
    }
  });

  it('ActivityLogEntries menu should load ActivityLogEntries page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('activity-log-entry');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('ActivityLogEntry').should('exist');
    cy.url().should('match', activityLogEntryPageUrlPattern);
  });

  describe('ActivityLogEntry page', () => {
    it('should have translated page title', () => {
      cy.visit(activityLogEntryPageUrl);
      cy.getEntityHeading('ActivityLogEntry').should('not.contain', 'professionalDashboardApp.patientServiceActivityLogEntry.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(activityLogEntryPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create ActivityLogEntry page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.url().should('match', new RegExp('/activity-log-entry/new$'));
        cy.getEntityCreateUpdateHeading('ActivityLogEntry');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', activityLogEntryPageUrlPattern);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/services/patientservice/api/activity-log-entries',
          body: activityLogEntrySample,
        }).then(({ body }) => {
          activityLogEntry = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/services/patientservice/api/activity-log-entries+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [activityLogEntry],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(activityLogEntryPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details ActivityLogEntry page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('activityLogEntry');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', activityLogEntryPageUrlPattern);
      });

      it('edit button click should load edit ActivityLogEntry page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('ActivityLogEntry');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', activityLogEntryPageUrlPattern);
      });

      it('edit button click should load edit ActivityLogEntry page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('ActivityLogEntry');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', activityLogEntryPageUrlPattern);
      });

      it('last delete button click should delete instance of ActivityLogEntry', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('activityLogEntry').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.url().should('match', activityLogEntryPageUrlPattern);

        activityLogEntry = undefined;
      });
    });
  });

  describe('new ActivityLogEntry page', () => {
    beforeEach(() => {
      cy.visit(activityLogEntryPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('ActivityLogEntry');
    });

    it('should create an instance of ActivityLogEntry', () => {
      cy.get(`[data-cy="patientId"]`).type('vivid longingly');
      cy.get(`[data-cy="patientId"]`).should('have.value', 'vivid longingly');

      cy.get(`[data-cy="occurredAt"]`).type('2026-07-23T06:31');
      cy.get(`[data-cy="occurredAt"]`).blur();
      cy.get(`[data-cy="occurredAt"]`).should('have.value', '2026-07-23T06:31');

      cy.get(`[data-cy="label"]`).type('majestic');
      cy.get(`[data-cy="label"]`).should('have.value', 'majestic');

      cy.get(`[data-cy="title"]`).type('whereas fundraising');
      cy.get(`[data-cy="title"]`).should('have.value', 'whereas fundraising');

      cy.get(`[data-cy="description"]`).type('bide that requite');
      cy.get(`[data-cy="description"]`).should('have.value', 'bide that requite');

      cy.get(`[data-cy="createdAt"]`).type('2026-07-23T20:20');
      cy.get(`[data-cy="createdAt"]`).blur();
      cy.get(`[data-cy="createdAt"]`).should('have.value', '2026-07-23T20:20');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        activityLogEntry = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.url().should('match', activityLogEntryPageUrlPattern);
    });
  });
});
