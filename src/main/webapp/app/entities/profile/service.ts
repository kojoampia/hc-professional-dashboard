import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { SKIP_ERROR_ALERT } from 'app/core/interceptor/error-handler.interceptor';
import { EmergencyContact } from 'app/entities/emergency-contact/model';
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
 * <h2>The only client for this endpoint, since T6</h2>
 *
 * <p>Until T6 `OnboardingApiService` carried a second pair on the same endpoint, speaking the
 * deprecated singular `emergencyContact` alias — three fields, one contact, where `profile.md:196`
 * requires **two** contacts each with an email and a nested address. T6 retired that pair with
 * `ClinicalProfileComponent`; the history is on {@link Profile} itself, with the ⛔ against
 * reintroducing the alias.
 *
 * <h2>The `PUT` is a partial update, and the pane depends on it</h2>
 *
 * <p>`profile.md` specifies `PUT` *and* a dialog per step, which together make a whole-document
 * replace wrong by construction — a pane saving its own slice would blank what the others wrote and
 * answer 200 doing it. `ProfileResource.updateOwnProfile` therefore applies only the fields the body
 * names, and **creates the row on first write**, which is what makes step 2 *"create the profile"*
 * rather than a `PUT` that 404s for every applicant.
 *
 * <h2>⛔ The read wire and the write wire are two vocabularies, and {@link update} translates</h2>
 *
 * <p>`GET /api/profile` answers the **entity** — `mobilePhone`, contacts carrying `phone` — which is
 * what {@link Profile} declares. `PUT /api/profile` binds the **frozen `ProfileDTO`** (the write
 * path the owner froze on 2026-10-14), whose wire is `mobileNumber` and contacts carrying
 * `phoneNumber`: `ProfileMapper.toEntity` reads `setMobilePhone(dto.getMobileNumber())`, and
 * `EmergencyContactDTO` has no `phone` field. Unknown keys are **silently dropped** on bind, so a
 * body sent in read vocabulary answers 200 while losing the mobile phone and every contact's phone —
 * found while T6 split this surface, previously live on the wizard's step-2 save.
 *
 * <p>The translation lives here, at the service boundary, so the panes and the read view go on
 * speaking one model and no caller can reach the endpoint in the wrong vocabulary. It renames only;
 * it never **adds** a key the caller did not provide, because on a partial write an invented key is
 * a write the caller never asked for.
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
   * <p>The body goes out in the **write vocabulary** — see the class note; the response comes back
   * as the entity, which is {@link Profile}.
   *
   * <p>`accountId` is never read from the body — `@JsonProperty(access = READ_ONLY)` drops it and the
   * service forces it from the token — so there is no body a caller could send that reaches somebody
   * else's profile. `status` is refused by name if a body carries it.
   */
  update(profile: Profile): Observable<Profile> {
    return this.http.put<Profile>(this.resourceUrl, toWriteBody(profile));
  }
}

/**
 * `api/`'s frozen `ProfileDTO`, as far as its vocabulary differs from the entity's: `mobileNumber`
 * where the entity says `mobilePhone`, and contacts carrying `phoneNumber` where the entity says
 * `phone`. Everything else is name-identical and passes through.
 */
type ProfileWriteBody = Omit<Profile, 'mobilePhone' | 'contacts'> & {
  mobileNumber?: string | null;
  contacts?: ContactWriteBody[] | null;
};

type ContactWriteBody = Omit<EmergencyContact, 'phone'> & { phoneNumber?: string | null };

/**
 * The read model, renamed into the write wire. Keys the caller did not provide stay absent —
 * `undefined` is dropped by JSON serialization, which is what a partial write requires — and
 * `contacts` is deliberately never defaulted to `[]`: an always-present empty list is the mistake
 * {@link Profile}'s own field note names, the one that would empty a clinician's next of kin on any
 * partial write.
 */
function toWriteBody(profile: Profile): ProfileWriteBody {
  const { mobilePhone, contacts, ...rest } = profile;
  const body: ProfileWriteBody = { ...rest };
  if ('mobilePhone' in profile) {
    body.mobileNumber = mobilePhone;
  }
  if ('contacts' in profile) {
    body.contacts = contacts == null ? contacts : contacts.map(toContactWriteBody);
  }
  return body;
}

/** One contact, `phone` ⟶ `phoneNumber`; the other five fields pass through by name. */
function toContactWriteBody(contact: EmergencyContact): ContactWriteBody {
  const { phone, ...rest } = contact;
  const body: ContactWriteBody = { ...rest };
  if ('phone' in contact) {
    body.phoneNumber = phone;
  }
  return body;
}
