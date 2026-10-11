import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { SKIP_ERROR_ALERT } from 'app/core/interceptor/error-handler.interceptor';
import { Profile } from './model';

/**
 * The caller's own credentialing profile — `GET`/`PUT /api/profile`, step 2's endpoint
 * (`profile.md:199`, shipped by T1).
 *
 * <h2>Two methods, deliberately</h2>
 *
 * <p>House rule: *"do not reinstate the full JHipster CRUD surface for an endpoint that needs two
 * methods."* There is no `DELETE` here and there is none on the server either — `ProfileResource`
 * omits it on purpose (`backlog.md` item 56): a bare `deleteById` orphaned six collections and a
 * deletion is the one change `ProfileStatus` cannot announce.
 *
 * <h2>⛔ Why a second client for an endpoint `OnboardingApiService` already calls</h2>
 *
 * <p>The wire shapes differ and only one of them can express step 2. `OnboardingApiService`'s pair
 * speaks the deprecated singular `emergencyContact` alias — three fields, one contact — and
 * `profile.md:196` requires **two** contacts each with an email and a nested address. The full
 * argument, including why widening the other type would break `backlog.md` row 230's compile-time
 * gate, is on {@link Profile} itself. **This is the surviving client**; the other two methods retire
 * with `ClinicalProfileComponent` in T6.
 *
 * <p>⚠ **Both write the same document and that is safe**, because `PUT /api/profile` is a partial
 * update: each caller touches only the fields it names, and `contacts` wins over the alias if a body
 * carries both.
 *
 * <h2>The `PUT` is a partial update, and the pane depends on it</h2>
 *
 * <p>`profile.md` specifies `PUT` *and* a dialog per step, which together make a whole-document
 * replace wrong by construction — a pane saving its own slice would blank what the others wrote and
 * answer 200 doing it. `ProfileResource.updateOwnProfile` therefore applies only the fields the body
 * names, and **creates the row on first write**, which is what makes step 2 *"create the profile"*
 * rather than a `PUT` that 404s for every applicant.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  /** `profile.md` § Other Elements: *"`api/onboarding/profile` should migrate to `api/profile`"*. */
  private readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/profile', 'professionalservice');

  /**
   * The caller's profile, or a 404 when there is none yet.
   *
   * <p>⚠ **404 is the ordinary state, not a failure** — an applicant has an account before they have
   * a profile, and so does every clinician an administrator invited. Opted out of the global error
   * banner for that reason: `backlog.md` records the untreated version of this exact 404 rendering a
   * red "Not found" over a page that was working. The caller shows an empty form.
   */
  find(): Observable<Profile> {
    return this.http.get<Profile>(this.resourceUrl, { context: new HttpContext().set(SKIP_ERROR_ALERT, true) });
  }

  /**
   * Writes the fields `profile` names onto the caller's own row, creating it if there is none.
   *
   * <p>`accountId` is never read from the body — `@JsonProperty(access = READ_ONLY)` drops it and the
   * service forces it from the token — so there is no body a caller could send that reaches somebody
   * else's profile. `status` is refused by name if a body carries it.
   */
  update(profile: Profile): Observable<Profile> {
    return this.http.put<Profile>(this.resourceUrl, profile);
  }
}
