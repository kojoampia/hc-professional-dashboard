import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { SKIP_ERROR_ALERT } from 'app/core/interceptor/error-handler.interceptor';
import { ProfessionalApplication } from './model';

/**
 * The caller's own professional application — step 4's endpoint (`profile.md:236-263`), the
 * applicant's half of `api/professional-application`, split out of `OnboardingApiService` by T6.
 *
 * <h2>Five methods, deliberately — the applicant's verbs and nothing else</h2>
 *
 * <p>House rule: *"do not reinstate the full JHipster CRUD surface for an endpoint that needs two
 * methods."* The reviewer's half of this endpoint — the queue, `/{id}` reads, the eleven lifecycle
 * transitions — stays on {@link app/health-connect/api/onboarding-api.service!OnboardingApiService},
 * which is the admin surface's client; nothing an applicant can reach needs those and a thin service
 * must not acquire them.
 *
 * <h2>Save and Submit are two server operations, not one button twice</h2>
 *
 * <p>Both store `agreed` and `authority`; what differs is the refusal. {@link saveConsent} stores an
 * incomplete application and answers 200 without a transition; {@link submit} refuses one with a 400
 * naming the unsatisfied requirement keys and stores nothing. A second Save is a 200 by design, a
 * second Submit a 409 from the state machine — saying "I am finished" twice is a conflict in a way
 * that saving twice is not. The table on `ApplicationUpdateComponent` is the full contract.
 */
@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  /** `profile.md` § Other Elements: *"`api/onboarding/applications` should migrate to `api/professional-application`"*. */
  private readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/professional-application', 'professionalservice');

  /**
   * The caller's application, or a 404 when there is none — the normal state for every clinician
   * seeded or invited rather than hired through the careers page. Opted out of the global error
   * banner because both callers treat the 404 as ordinary (the pane opens its consent form, the read
   * view renders the not-consented sentence); the untreated version put a red "Not found" over a
   * page that was working.
   */
  find(): Observable<ProfessionalApplication> {
    return this.http.get<ProfessionalApplication>(`${this.resourceUrl}/me`, {
      context: new HttpContext().set(SKIP_ERROR_ALERT, true),
    });
  }

  /**
   * Starts the caller's application, recording step 4's consent and requested authority.
   *
   * <p>`agreed: true` is hard-coded because the caller only reaches this from a ticked consent box;
   * the server refuses `false` with a 400 either way, which is the half that matters. `authority` is
   * validated server-side against the eight professional disciplines — `ROLE_ADMIN` and `ROLE_USER`
   * are refused, the same two `careers-handoff.service.ts` leaves out of `KNOWN_TRACKS`.
   *
   * <p>`source` is the careers attribution and belongs to the creation only — the review queue reads
   * it and the WP7 funnel counts it; it is not re-sent on later saves.
   */
  start(authority: string, source?: string | null): Observable<ProfessionalApplication> {
    return this.http.post<ProfessionalApplication>(this.resourceUrl, {
      agreed: true,
      authority,
      source: source ?? null,
    });
  }

  /**
   * Step 4's **Save** — `PUT /me`: stores the consent and the requested authority, advancing to
   * `CREDENTIAL_REVIEW` only when every requirement is satisfied. Repeatable: a Save on an
   * application already in `CREDENTIAL_REVIEW` stores the answers and returns it unadvanced.
   */
  saveConsent(authority: string): Observable<ProfessionalApplication> {
    return this.http.put<ProfessionalApplication>(`${this.resourceUrl}/me`, { agreed: true, authority });
  }

  /**
   * `PROFILE_COMPLETED`, through the server's state machine. Submitting straight from
   * `APPLICATION_STARTED` is a 409, so the pane calls this first and carries on through the error an
   * application already past that step answers.
   */
  completeProfile(): Observable<ProfessionalApplication> {
    return this.http.put<ProfessionalApplication>(`${this.resourceUrl}/me/complete-profile`, null);
  }

  /**
   * Step 4's **Submit** — `PUT /me/submit`. An incomplete application gets a 400 naming the
   * unsatisfied requirement keys and **nothing is stored**; a complete one does exactly what Save
   * does. Carries the body because step 4 has Submit store the consent and authority as well as
   * advancing the status.
   */
  submit(authority: string): Observable<ProfessionalApplication> {
    return this.http.put<ProfessionalApplication>(`${this.resourceUrl}/me/submit`, { agreed: true, authority });
  }
}
