import { Injectable, computed, inject, signal } from '@angular/core';

import { Account } from 'app/core/auth/account.model';
import { OnboardingStatus } from 'app/health-connect/api/onboarding-api.service';
import { OnboardingProgressService } from './onboarding-progress.service';

/**
 * `profile.md`'s four onboarding panes, in the order the specification walks them.
 *
 * <p>A runtime array with the union derived from it, rather than a bare union, for the reason
 * `DUTY_ROSTER_SHIFTS` and `USER_AUTHORITIES` are: **a union cannot be enumerated at run time and so
 * cannot be asserted against anything**, and this list's order *is* the sequence — `wizard.service.spec.ts`
 * walks it rather than restating it.
 *
 * <p>⚠ **These are the wizard's names, and three of the four differ from the wire's.** The server's
 * `OnboardingSteps` calls them `account`, `profile`, `documents` and **`consent`**; `profile.md` calls
 * step 4 the application. {@link WIRE_STEP_FOR_PANE} is the one place that mapping is written down.
 */
export const WIZARD_PANES = ['account', 'profile', 'documents', 'application'] as const;

export type WizardPane = (typeof WIZARD_PANES)[number];

/**
 * Where the wizard's panes live, as route segments under the page they overlay.
 *
 * <p>⚠ **Under `dashboard`, and that is `profile.md:171-173`'s doing** — step 1's dialog opens *over
 * the dashboard*, and the house routed-overlay idiom makes the overlay a **child of the page it
 * overlays** so the page stays mounted and renders underneath (`health-connect.routes.ts` says why,
 * at the patients tree). The four panes are siblings there, each its own overlay host, so each
 * carries its own title and each is a URL the browser's back button steps between.
 *
 * <p>⛔ **It is not the top-level `/onboarding`.** That path exists, has no component behind it, and
 * redirects to `/account/profile?tab=application`; it is the activation email's landing spot and
 * **T6's to re-point**, not T8's. Nothing here touches it, so until T6 the email lands on the tab
 * page and the wizard is reached from the sidebar or directly.
 */
const WIZARD_BASE_PATH = 'dashboard/onboarding';

/**
 * The absolute route of one pane — the single spelling of a pane's address.
 *
 * <p>⭐ **A path helper is not the "second source of truth" `profile-addendum.md` § 3 T8 warns
 * about, and the distinction is worth stating because it looks like one.** What that warning refuses
 * is a service that *decides where the reader goes*, duplicating the router. This is the opposite
 * direction: the route table itself is built from this function, the nav item reads it, and the panes
 * read it, so there is exactly one place a pane's address is written. {@link WizardService} — the
 * class — still owns sequencing and nothing else, and its spec asserts it imports no router and calls
 * no navigation.
 */
export function wizardPanePath(pane: WizardPane): string {
  return `/${WIZARD_BASE_PATH}/${pane}`;
}

/** The route-table form: the segments under `dashboard`, without the leading slash. */
export function wizardPaneRoute(pane: WizardPane): string {
  return `${WIZARD_BASE_PATH.split('/').slice(1).join('/')}/${pane}`;
}

/**
 * The four account fields `profile.md:171-172` names as step 1's trigger.
 *
 * <p>⛔ **Four, including `imageUrl`** — settled by `backlog.md` row 232 against the alternative of
 * dropping it, and satisfiable only since that row shipped the avatar upload. A trigger of four
 * fields over a form of three is what made step 1 reopen for ever; the form has an avatar input now,
 * so the two agree.
 */
export const ACCOUNT_STEP_FIELDS = ['firstName', 'lastName', 'langKey', 'imageUrl'] as const satisfies readonly (keyof Account)[];

/**
 * The statuses an application can hold **before** anybody has pressed Submit.
 *
 * <p>Written as the two pre-submission statuses rather than as a list of the eleven that follow,
 * because the state machine makes the complement open-ended: `PROFILE_COMPLETED → CREDENTIAL_REVIEW`
 * is the only legal move out of the pre-submission band (`OnboardingService.LEGAL_TRANSITIONS`), so
 * everything else is reachable only by having submitted. A status added to the lifecycle therefore
 * lands on the submitted side by default, which is the safe direction here: it opens panes rather
 * than locking them.
 */
const PRE_SUBMISSION_STATUSES = ['APPLICATION_STARTED', 'PROFILE_COMPLETED'] as const satisfies readonly OnboardingStatus[];

/** The server step each pane is answered by, for the three panes the meter can see. */
const WIRE_STEP_FOR_PANE = {
  profile: 'profile',
  documents: 'documents',
  application: 'consent',
} as const;

/**
 * Which onboarding pane may be opened, given what has actually been saved — and **nothing else**.
 *
 * <h2>⛔ Sequencing only. This service does not navigate and does not write a status</h2>
 *
 * <p>The panes are **routed overlays** through `health-connect.routes` (`profile-addendum.md` § 3 T8),
 * so the router already owns where the reader is: a pane is deep-linkable and the browser's back
 * button steps between them. A service that also navigated would be a second source of truth for the
 * same fact, which is the failure that paragraph names. So the only question answered here is
 * *may this pane open*, and the caller decides what to do about the answer.
 *
 * <p>⛔ **And it exposes no status write of any kind**, deliberately. `profile.md` requires that
 * *"it should be possible to navigate back to a previous step and make changes"*, and the naive
 * reading of that — step back, so step the status back — is illegal: `CREDENTIAL_REVIEW` has no
 * transition to `PROFILE_COMPLETED` in `LEGAL_TRANSITIONS` and the server answers **409**. A
 * backward write is not something to handle; it is something never to attempt.
 *
 * <h2>The rule, stated once</h2>
 *
 * <blockquote><b>A pane may open when every pane before it has saved — and once the application has
 * been submitted, every pane may open, because from that moment the wizard is an editing surface
 * rather than a sequence.</b> The first pane may always open. No pane ever closes again.</blockquote>
 *
 * <p>⚠ **"May open" governs the footer's Next button, NOT reachability — say it that way round.** The
 * four pane routes carry **no guard of their own**: they inherit the dashboard's, which admits
 * `ROLE_USER`, so **every pane resolves on a deep link whatever this service answers**, and a reader
 * who types `/dashboard/onboarding/documents` gets it. That is deliberate rather than overlooked. A
 * guard here would be a third place deciding what "saved" means — after this service and after the
 * server — and the two gates that actually matter are elsewhere and are not this: `PUT /me/submit`
 * **400s** naming the unsatisfied requirement keys and stores nothing, and the document upload's
 * `ownProfile` refuses a caller with no profile in its own words. ⛔ So do not read this rule as
 * access control and do not delete a server-side check on its strength; it is the sequence made
 * visible, and an applicant who arrives out of order meets a pane that cannot be saved rather than a
 * pane that was hidden.
 *
 * <p>⭐ **The post-submit half is measured, not assumed** (`api/OnboardingService:506-512`): an
 * application already in `CREDENTIAL_REVIEW` that is saved again is **stored silently, with no
 * re-transition and no second event**, and the profile and document writes are not gated on
 * application status at all. So back-navigation after submission is not merely permitted by the
 * specification — it already works against the shipped service, and it needs no status write to do
 * it. An applicant who notices a wrong address after submitting edits it and the reviewer sees the
 * correction.
 *
 * <h2>Where each answer comes from, and why step 1 is the odd one</h2>
 *
 * <table>
 *   <tr><th>pane</th><th>read from</th></tr>
 *   <tr><td>1 account</td><td><b>the account itself</b> — the four fields of {@link ACCOUNT_STEP_FIELDS}</td></tr>
 *   <tr><td>2 profile · 3 documents · 4 application</td><td>the shipped meter's coarse `steps` (`backlog.md` row 230)</td></tr>
 * </table>
 *
 * <p>⛔ **Step 1 is NOT read from `steps.account`, and that is the whole reason this service takes an
 * account at all.** That wire field is a stored projection fed by Kafka frames and `backlog.md` row
 * 233 is open against it: it can under-report for ever and never self-heal, for three independent
 * reasons its own DTO comment lists. Reading it here would lock pane 2 behind a frame that may never
 * arrive. ⚠ **Row 232's answer to Q12 is also why it is safe to require step 1 at all** — before the
 * avatar upload existed, `imageUrl` was writable by no surface in the estate and this rule would have
 * been unsatisfiable. ⛔ **Do not "fix" the meter to compensate for row 233**; read the account, which
 * is what the browser already has.
 *
 * <p>⚠ **Nothing is re-derived beyond what is already provided.** Which *values* step 2 still needs is
 * `profile-requirements.ts`'s (row 230 unit B); which *requirement* is outstanding is the server's;
 * this file only asks whether a step is done. Three layers, no duplication.
 */
@Injectable({ providedIn: 'root' })
export class WizardService {
  private readonly progressService = inject(OnboardingProgressService);

  /**
   * The account the sequence is judged against — set by whoever has it, which is the pane or the
   * dashboard rather than this service.
   *
   * <p>Not fetched here on purpose: `AccountService.identity()` caches one account for the whole
   * application and every surface that needs it already subscribes. A second fetch would be a second
   * answer to "who is signed in", and this service exists to remove second answers.
   */
  private readonly account = signal<Account | null>(null);

  readonly panes = WIZARD_PANES;

  setAccount(account: Account | null): void {
    this.account.set(account);
  }

  /**
   * Whether step 1's four account fields are all non-empty — `profile.md:171-172`'s trigger, read in
   * the affirmative.
   *
   * <p>Blank-is-empty rather than merely null, the same reading `provided()` takes in
   * `profile-requirements.ts` and `ProfileCompleteness.hasText` takes server-side: a whitespace-only
   * first name is what an untouched input posts, and counting it would make the step satisfiable by
   * saving an empty form.
   *
   * <p>Null until the account has arrived, so a caller cannot read "not loaded yet" as "incomplete" —
   * the distinction `OnboardingProgressService.complete` draws for the same reason, and for the same
   * consequence: a dialog opened on an unknown account is a dialog opened over everybody.
   */
  readonly accountStepComplete = computed<boolean | null>(() => {
    const account = this.account();
    if (!account) {
      return null;
    }
    return ACCOUNT_STEP_FIELDS.every(field => filled(account[field]));
  });

  /**
   * Whether the application has been submitted at least once — the state in which every pane reopens.
   *
   * <p>Null while the meter has not answered. `status: null` means *no application at all*, which is
   * the normal state for every clinician an administrator invited, and it is **not** submitted.
   */
  readonly submitted = computed<boolean | null>(() => {
    const progress = this.progressService.progress();
    if (!progress) {
      return null;
    }
    const status = progress.status;
    return status !== null && !(PRE_SUBMISSION_STATUSES as readonly OnboardingStatus[]).includes(status);
  });

  /**
   * Whether one pane has been saved — the question {@link canOpen} is built from.
   *
   * <p>Null while the input that answers it has not arrived. ⚠ **A pane is not "saved" because the
   * applicant looked at it**: step 3 is the server's four mandatory documents and step 4 is consent,
   * both read off the meter, so closing a pane proves nothing and nothing here records visits.
   */
  saved(pane: WizardPane): boolean | null {
    if (pane === 'account') {
      return this.accountStepComplete();
    }
    const steps = this.progressService.progress()?.steps;
    return steps ? steps[WIRE_STEP_FOR_PANE[pane]] : null;
  }

  /**
   * Whether `pane` may be opened now.
   *
   * <p>⚠ **Fails closed on an unknown answer.** A pane whose predecessor's state has not loaded is
   * refused rather than admitted, because the two mistakes are not equal: refusing briefly shows a
   * disabled Next for the moment before the meter answers, while admitting early walks an applicant
   * into a pane whose save the server will refuse — *"the client reads complete while the server
   * refuses"*, which is the failure row 230 exists to remove. The first pane is exempt, having no
   * predecessor to know anything about.
   */
  canOpen(pane: WizardPane): boolean {
    const index = WIZARD_PANES.indexOf(pane);
    if (index <= 0) {
      return true;
    }
    if (this.submitted() === true) {
      return true;
    }
    return WIZARD_PANES.slice(0, index).every(earlier => this.saved(earlier) === true);
  }

  /** The pane after `pane`, or null at the last one — which has Submit rather than Next. */
  next(pane: WizardPane): WizardPane | null {
    const index = WIZARD_PANES.indexOf(pane);
    return index >= 0 && index < WIZARD_PANES.length - 1 ? WIZARD_PANES[index + 1] : null;
  }

  /**
   * The pane before `pane`, or null at the first one — which has no Back button
   * (`profile.md:275-277`).
   */
  previous(pane: WizardPane): WizardPane | null {
    const index = WIZARD_PANES.indexOf(pane);
    return index > 0 ? WIZARD_PANES[index - 1] : null;
  }

  /**
   * The first pane the applicant still has to do, or null when all four are saved.
   *
   * <p>What the dashboard opens on arrival, and what Next falls back to. ⚠ **Null is not "finished"
   * in the sense that matters to the reviewer** — the four steps being saved is completeness, and
   * `ACTIVE` additionally needs an administrator. {@link OnboardingProgressService.complete} is the
   * figure that gates anything.
   */
  readonly firstOutstandingPane = computed<WizardPane | null>(() => {
    // Read through the signals the computed must depend on, not through saved(), which is a method.
    const states: Record<WizardPane, boolean | null> = {
      account: this.accountStepComplete(),
      profile: this.progressService.progress()?.steps?.profile ?? null,
      documents: this.progressService.progress()?.steps?.documents ?? null,
      application: this.progressService.progress()?.steps?.consent ?? null,
    };
    return WIZARD_PANES.find(pane => states[pane] !== true) ?? null;
  });
}

/** Non-blank, for the one reading of "provided" this file has. See {@link WizardService.accountStepComplete}. */
function filled(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined;
}

/**
 * Where the step cursor lives — `profile.md:202`: *"keep the saved profile in session storage and
 * open the next dialog"*, and `:206`: step 3 opens *"reading the profile from session storage"*.
 *
 * <h2>⛔ THE ID ONLY, and the first version of this stored all thirty-nine fields</h2>
 *
 * <p>It wrote the whole saved `Profile` — `cardNumber`, `birthDate`, `mobilePhone` and **both next of
 * kin with their home addresses** — into `sessionStorage`, while the docblock printed directly above
 * it quoted `profile-addendum.md` § 5 saying *"session storage for the step cursor only; step 3 needs
 * just `Profile.id`, which the step-2 response carries."* **The code did the opposite of the sentence
 * above it**, which is this estate's own recurring failure and worth naming as such rather than
 * fixing quietly.
 *
 * <p>Three things made it worse than untidy, and only the first is about tidiness: **nothing read any
 * field but the id**; **nothing cleared it on sign-out**, so a clinician's identity-document number
 * and their next of kin's address outlived their session on a shared ward device — which is the
 * argument `LoginService.logout` already makes in its own comment about a *completion percentage*,
 * and it applies far harder here; and step 3's early return on a stored id made a second account
 * signing in to the same tab adopt the first one's row.
 *
 * <p>⚠ **The mechanism is kept rather than deleted.** `profile.md` names this handoff twice, and a
 * specification that says "session storage" is not satisfied by a component that re-reads the server.
 *
 * <h2>What the id is, and is not, for</h2>
 *
 * <p>⚠ **It is not sent anywhere.** `PersonalDocument.profileId` is **server-derived** — the upload
 * resolves it from the caller's own profile and the client never names it — and `ownProfile` refuses
 * an upload from a caller with no profile in its own words. So the id is a cursor, not an argument:
 * what it buys step 3 is knowing step 2 has been saved without asking again.
 *
 * <p>⭐ **Here rather than on the step-2 component**, where it began: `LoginService` has to clear it,
 * and a sign-out funnel importing a lazily-loaded *component* to reach a storage helper is a worse
 * coupling than the one it would fix. These are module-level functions, so {@link WizardService} —
 * the class — still owns sequencing and nothing else.
 *
 * <p>Session rather than local storage so it cannot outlive the tab, and every call is wrapped
 * because storage throws in private-browsing mode — in which case step 3 asks the server instead,
 * which is the whole reason that fallback exists.
 */
export const WIZARD_PROFILE_STORAGE_KEY = 'hpd-wizard-profile';

export function storeWizardProfileId(id: string | null | undefined): void {
  if (!id) {
    return;
  }
  try {
    sessionStorage.setItem(WIZARD_PROFILE_STORAGE_KEY, JSON.stringify({ id }));
  } catch {
    // Storage unavailable (private mode). Step 3 falls back to reading the profile itself.
  }
}

/** The stored id, or null — never an error, for the reason above. */
export function readWizardProfileId(): string | null {
  try {
    const raw = sessionStorage.getItem(WIZARD_PROFILE_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as { id?: unknown }) : null;
    return typeof parsed?.id === 'string' && parsed.id.length > 0 ? parsed.id : null;
  } catch {
    return null;
  }
}

/**
 * Dropped on sign-out, from `LoginService.logout()` — the single funnel the sidebar's button and
 * `AuthExpiredInterceptor`'s 401 path both come through.
 *
 * <p>⚠ **Synchronously, before the sign-out request**, for the reason that method already states
 * about the meter: if the call itself fails, `complete` never fires, and whatever was left behind
 * becomes the next account's.
 */
export function clearWizardProfileId(): void {
  try {
    sessionStorage.removeItem(WIZARD_PROFILE_STORAGE_KEY);
  } catch {
    // ignore
  }
}
