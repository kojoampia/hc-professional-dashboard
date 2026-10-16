import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { Account } from 'app/core/auth/account.model';

/**
 * Step 1's write — `PUT /api/account` on the **gateway** (`profile.md:181`, shipped by T4).
 *
 * <h2>One method, and it is the only one missing</h2>
 *
 * <p>`GET /api/account` already has a caller and must keep it: `AccountService.identity()` loads the
 * account once and caches it for the whole application, and a second fetch here would be a second
 * answer to "who is signed in". So this service is the write half alone, and the read stays where
 * every surface already reads it.
 *
 * <p>⛔ **The retired `AccountService.save()` was NOT this.** That was `POST /api/account`,
 * deprecated on the gateway since T4 and removed by T6 with `SettingsComponent`, its only caller in
 * the estate. The deprecated verb is not the one `profile.md` names, and no new caller may
 * reintroduce it — the gateway retires the POST once no client speaks it.
 *
 * <h2>⚠ The body is the whole account document, and the endpoint reads five fields of it</h2>
 *
 * <p>`AdminUserDTO` is what the handler binds — by the owner's ruling, overruling a narrower record
 * (`profile-addendum.md` § 6a, F4: *"the specification names both the operation and the bound
 * type"*). It is `@Valid`, and `login` is `@NotBlank` with a pattern, so **a body carrying only the
 * edited fields is a 400**: the stored account has to be sent back with the edits applied, which is
 * what {@link Account} already holds.
 *
 * <p>⭐ **Sending `id`, `login`, `activated` and `authorities` is harmless and that is structural, not
 * trust.** `AccountResource.ownAccountUpdate` reads **five getters by name** — `firstName`,
 * `lastName`, `email`, `langKey`, `imageUrl` — and passes them as five arguments to the narrow
 * `UserService.updateUser`, never the `AdminUserDTO` overload that clears the authority set and
 * refills it from the body. `AccountResourceIT.testSaveAccount` and its `PUT` twin assert that
 * `activated` and `authorities` do not come from the request, plus `id` and `login` by name.
 *
 * <p>⚠ **It is a replace, not a patch**, and the five have no null guards server-side beyond `email`.
 * With *"all fields are required"* that is coherent — but it means a caller must not send a partly
 * built account. Step 1's pane merges onto the loaded one for exactly this reason.
 */
@Injectable({ providedIn: 'root' })
export class UserAccountService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  /** No microservice argument: the account lives on the gateway, not in `professionalservice`. */
  private readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/account');

  /**
   * `updateUserAccount(AdminUserDTO)` — the operation `profile.md` names.
   *
   * <p>Answers `Mono<Void>`, so there is no body to read back; the caller is the one that knows what
   * it sent. A 400 means the email belongs to another login (`EmailAlreadyUsedException`).
   */
  updateUserAccount(account: Account): Observable<void> {
    return this.http.put<void>(this.resourceUrl, account);
  }
}
