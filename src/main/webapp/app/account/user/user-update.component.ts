import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

import SharedModule from 'app/shared/shared.module';
import { AlertService } from 'app/core/util/alert.service';
import { Account } from 'app/core/auth/account.model';
import { AccountService } from 'app/core/auth/account.service';
import { LANGUAGES } from 'app/config/language.constants';
import { PersonalDocumentService } from 'app/entities/personal-document/service';
import { OnboardingProgressService } from 'app/onboarding/onboarding-progress.service';
import { WizardService } from 'app/onboarding/wizard.service';
import FileUploadTriggerComponent from 'app/shared/health-connect/form-controls/file-upload-trigger.component';
import WizardFooterComponent from 'app/shared/health-connect/wizard/wizard-footer.component';
import AccountAvatarComponent from './account-avatar.component';
import { AVATAR_ACCEPT, prepareAvatar } from './avatar-image';
import { UserAccountService } from './user-account.service';

/**
 * The largest source file the picker accepts, **before** the browser downscales it.
 *
 * <p>⚠ **Not the server's ceiling and not meant to match it.** `api/` refuses above 2 MB *decoded*,
 * and `prepareAvatar` guarantees the upload lands far below that whatever arrives here — so this is
 * not a gate on the upload at all. It is a bound on what the **browser** is asked to decode: a
 * 16 Mpx raster is 64 MB of pixels, which `api/` measured peaking at 92 MB through a re-encode, and
 * a phone's own camera roll is the realistic source. 10 MB covers a 48 Mpx original and stops the
 * applicant handing a tab a file that will hang it.
 */
const MAX_SOURCE_BYTES = 10_000_000;

/**
 * **Step 1 — complete the account** (`profile.md:169-181`), as the wizard's first pane.
 *
 * <h2>Four fields in the trigger and four in the form, at last</h2>
 *
 * <p>`profile.md:171-172` opens this dialog when any of `firstName`, `lastName`, `langKey` or
 * **`imageUrl`** is empty, and `:174-178` listed the required inputs as first name, last name and
 * language — three. ⛔ **Four in the trigger over three in the form is a dialog that reopens for
 * ever**, which `profile-addendum.md` § 5 Q12 records as *"indistinguishable from a broken sign-in"*.
 * The owner settled it by **building the upload** (`backlog.md` row 232) rather than dropping the
 * field, so this pane has an avatar input and the trigger is satisfiable.
 *
 * <p>⚠ **`email` is not an input here and is not one of the four.** It is sent — the endpoint's
 * `@Valid AdminUserDTO` requires it and `ownAccountUpdate` reads it — but it is not step 1's to
 * change: changing an email is an identity change with a uniqueness check and a 400 of its own
 * (`EmailAlreadyUsedException`), and `profile.md` does not put it in this dialog. It is carried
 * through from the loaded account untouched.
 *
 * <h2>⭐ The language dropdown is endonyms, and needs no new catalogue entry</h2>
 *
 * <p>`findLanguageFromKey` already holds the display names in their **own** language — `English`,
 * `Español`, `Français`, `Deutsch` — behind the JHipster needle, and
 * `config/language.constants.spec.ts` already gates *"has a display name for every language it
 * offers"*. ⛔ **Do not add translated language names to the four catalogues**: a language's name is
 * rendered in its own language, never translated per locale, so four translated copies would be the
 * regression. `profile-addendum.md` § 2's correction block is emphatic about this, and all this pane
 * needs is `settings.form.language`, which exists in all four already.
 *
 * <h2>The avatar is two writes, in this order, and the order is the whole of it</h2>
 *
 * <ol>
 *   <li>`POST /api/personal-document/avatar` → a document id;</li>
 *   <li>`PUT /api/account` with `imageUrl` set to that document's content path.</li>
 * </ol>
 *
 * <p>⚠ **The second one runs immediately, not on Save**, and that is deliberate: a replacement
 * **changes the document id** and deletes the previous row outright (`api/` deletes rather than
 * archives an avatar — nobody needs to know which photograph of themselves a nurse had in March).
 * So between the two writes `imageUrl` names a document that no longer exists, and leaving that
 * window open until the applicant happens to press Save would make a broken avatar the normal state.
 * `AccountAvatarComponent` renders the gap as initials rather than as an error, which is the other
 * half of the same decision.
 *
 * <p>⛔ **And the immediate `PUT` carries the LOADED account, not the form.** The applicant may not
 * have typed their name yet when they choose a photograph; `PUT /api/account` is a replace with no
 * null guards beyond `email`, so sending the half-filled form here would store its blanks. The form's
 * values go to the server when Save is pressed and not before.
 */
@Component({
  standalone: true,
  selector: 'hpd-user-update',
  imports: [SharedModule, ReactiveFormsModule, FileUploadTriggerComponent, AccountAvatarComponent, WizardFooterComponent],
  templateUrl: './user-update.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class UserUpdateComponent implements OnInit {
  private readonly accountService = inject(AccountService);
  private readonly userAccountService = inject(UserAccountService);
  private readonly personalDocumentService = inject(PersonalDocumentService);
  private readonly alertService = inject(AlertService);
  private readonly translateService = inject(TranslateService);
  private readonly progressService = inject(OnboardingProgressService);
  readonly wizard = inject(WizardService);

  readonly languages = LANGUAGES;
  readonly avatarAccept = AVATAR_ACCEPT;
  readonly avatarAcceptedTypes = AVATAR_ACCEPT.split(',');
  readonly maxSourceBytes = MAX_SOURCE_BYTES;

  readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly account = signal<Account | null>(null);

  /**
   * The three fields this pane edits, all required — `profile.md:175`: *"all fields are required"*.
   *
   * <p>⚠ **The avatar is the fourth required value and is deliberately NOT a form control.** It is
   * not typed, it is uploaded, and its value is written by its own request before Save runs — so a
   * control for it would be a control nothing sets and `Validators.required` on it would disable Save
   * for a value that is already stored. {@link accountComplete} is what reports the fourth field, and
   * it reads the account rather than the form.
   */
  readonly form = new FormGroup({
    firstName: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    lastName: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    // Min 2 / max 10 mirrors AdminUserDTO's @Size on langKey, so a value this form can hold is a
    // value the endpoint accepts. Required because an untouched select is '' and '' is no language.
    langKey: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
  });

  /** Whether all four of step 1's fields are now satisfied — the avatar read from the account. */
  readonly accountComplete = computed(() => this.wizard.accountStepComplete() === true);

  readonly avatarUrl = computed(() => this.account()?.imageUrl ?? null);

  readonly initials = computed(() => {
    const account = this.account();
    if (!account) {
      return '';
    }
    const first = account.firstName?.trim().charAt(0) ?? '';
    const last = account.lastName?.trim().charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || account.login.slice(0, 2).toUpperCase();
  });

  ngOnInit(): void {
    this.progressService.load();
    this.accountService.identity().subscribe({
      next: account => {
        if (!account) {
          this.loadState.set('error');
          return;
        }
        this.adopt(account);
        this.loadState.set('ready');
      },
      error: () => this.loadState.set('error'),
    });
  }

  /** Step 1's Save — the three typed fields, merged onto the stored account. */
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const account = this.account();
    if (!account || this.saving()) {
      return;
    }
    const { firstName, lastName, langKey } = this.form.getRawValue();
    this.write({ ...account, firstName, lastName, langKey }, 'healthConnect.onboarding.wizard.toast.accountSaved');
  }

  /**
   * A chosen photograph: downscale in the browser, upload, then record the path on the account.
   *
   * <p>⚠ **The downscale is not an optimisation**, and `avatar-image.ts` carries the argument: the
   * server strips EXIF — GPS coordinates with it, which is the point — and the orientation flag goes
   * too, so a portrait phone photograph would be stored sideways unless the rotation is baked into
   * the pixels first. It also keeps the upload under the three ceilings a phone original breaks.
   */
  chooseAvatar(files: readonly File[]): void {
    const file = files[0];
    const account = this.account();
    if (!file || !account || this.uploading()) {
      return;
    }
    this.uploading.set(true);
    prepareAvatar(file).then(
      prepared =>
        this.personalDocumentService.createAvatar(prepared.data, prepared.dataContentType).subscribe({
          next: document => {
            // Straight on to the account write — see the class note on why this does not wait for
            // Save. `uploading` stays true across both so the picker cannot fire twice.
            this.write(
              { ...account, imageUrl: this.personalDocumentService.avatarContentPath(document.id) },
              'healthConnect.onboarding.wizard.toast.avatarSaved',
              () => this.uploading.set(false),
            );
          },
          error: () => this.uploading.set(false),
        }),
      () => {
        // The browser could not read the file — not the server refusing it. Said as its own message
        // rather than letting the global banner report an upload that never happened.
        this.uploading.set(false);
        this.alertService.showToast('healthConnect.onboarding.wizard.avatarUnreadable');
      },
    );
  }

  /** A file the picker itself refused: wrong type, or past {@link MAX_SOURCE_BYTES}. */
  rejectedAvatar(): void {
    this.alertService.showToast('healthConnect.onboarding.wizard.avatarRejected');
  }

  /**
   * The one `PUT /api/account` call, used by both writes.
   *
   * <p>⚠ **It re-publishes the account locally rather than re-fetching it.** `AccountService` caches
   * one account for the whole application and `authenticate()` is what pushes it to every subscriber
   * — the sidebar card among them, which is how a new avatar appears there without a reload. A forced
   * `identity(true)` would also work and would additionally run `navigateToStoredUrl()`, which can
   * move the reader; the retired `SettingsComponent.save()` set the precedent for the local update.
   */
  private write(account: Account, toastKey: string, done?: () => void): void {
    this.saving.set(true);
    this.userAccountService.updateUserAccount(account).subscribe({
      next: () => {
        this.adopt(account);
        this.accountService.authenticate(account);
        if (account.langKey !== this.translateService.currentLang) {
          this.translateService.use(account.langKey);
        }
        this.saving.set(false);
        this.alertService.showToast(toastKey);
        // Step 1 is the one step api/ cannot compute, and the gateway publishes an
        // AccountDetailsUpdated frame for it (row 230 unit A). Re-reading the meter is still worth
        // it: the frame is asynchronous and row 233 is open against the projection, whereas the
        // wizard's own step-1 answer comes from the account this method just stored.
        this.progressService.refresh();
        done?.();
      },
      error: () => {
        this.saving.set(false);
        done?.();
      },
    });
  }

  /** Keeps the local account, the form and the wizard's sequencing input in step. */
  private adopt(account: Account): void {
    this.account.set(account);
    this.wizard.setAccount(account);
    this.form.patchValue(
      {
        firstName: account.firstName ?? '',
        lastName: account.lastName ?? '',
        langKey: account.langKey ?? '',
      },
      { emitEvent: false },
    );
  }
}
