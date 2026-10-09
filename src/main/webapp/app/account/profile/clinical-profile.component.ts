import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import SharedModule from 'app/shared/shared.module';
import { AlertService } from 'app/core/util/alert.service';
import { OnboardingProgressService } from 'app/onboarding/onboarding-progress.service';
import { IDENTITY_TYPES, OnboardingApiService, OnboardingProfileDto } from 'app/health-connect/api/onboarding-api.service';
import { PersonalDocumentType } from 'app/entities/personal-document/types.enum';
import { Sex } from 'app/entities/profile/sex.enum';
import { AccountService } from '../../core/auth/account.service';
import { Account } from '../../core/auth/account.model';

/**
 * The clinician's own credentialing profile, editable after approval.
 *
 * <p>Until now this data could only be entered once, inside the onboarding wizard, and the wizard
 * closes when the application is approved — so a clinician who moved house or changed their
 * emergency contact had no way to say so. Same endpoints as the wizard
 * ({@code GET/PUT /api/profile}, both {@code .authenticated()} rather than clinical-role gated), so
 * this needs nothing new from {@code api/}.
 *
 * <p>⚠ <b>Those two moved from {@code /api/onboarding/profile} in F8</b>, per {@code profile.md}
 * § Other Elements, and the semantics moved with them: the old {@code PUT} was a thirteen-field
 * whole-document replace and the new one applies only the fields the body names. The merge in
 * {@link #buildPayload} is therefore no longer load-bearing — see the note there.
 *
 * <p><b>Name and email are deliberately absent.</b> They exist here <i>and</i> on the gateway
 * account, and the account is the owner — it is what signs you in, what the sidebar card greets you
 * by, and what the account section above edits. Showing both would put the same three fields on one
 * page twice, with one save silently not affecting the other. What this section keeps is everything
 * the account has no concept of: title, birth date, sex, mobile, identity card, address, next of kin.
 *
 * <p>Because they are absent from the form, {@link #save} merges over the profile it loaded rather
 * than sending the form alone, and {@code clinical-profile.component.spec.ts} pins it.
 *
 * <p>⭐ <b>That merge used to be the only thing preventing data loss and no longer is.</b>
 * {@code upsertProfile} wrote through {@code PUT /api/onboarding/profile}, a whole-document replace,
 * so sending the form alone would have blanked the name the credentialing record is filed under —
 * correctness was a property of this caller. Since F8 the endpoint is {@code PUT /api/profile}, a
 * partial write, so a body that omits a field leaves it as stored. The merge is kept because it is
 * harmless and because the round trip is what the spec asserts; <b>it is no longer the guard</b>,
 * and the next pane to be written does not need to repeat it.
 */
@Component({
  standalone: true,
  selector: 'hpd-clinical-profile',
  imports: [SharedModule, FormsModule, ReactiveFormsModule],
  templateUrl: './clinical-profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ClinicalProfileComponent implements OnInit {
  private readonly api = inject(OnboardingApiService);
  private readonly alertService = inject(AlertService);
  private readonly progressService = inject(OnboardingProgressService);
  private readonly accountService = inject(AccountService);

  readonly identityTypes = IDENTITY_TYPES;
  readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly saving = signal(false);
  readonly currentUser = signal<Account | null>(null);

  /**
   * The profile as the server last gave it to us, kept whole so {@link #save} can merge onto it.
   * Null until the first load resolves, and after a 404 — a clinician created by admin invitation
   * has an account before they have a profile, and an empty form is the right thing to show them.
   */
  private loaded: OnboardingProfileDto | null = null;

  /**
   * Required exactly where the onboarding wizard requires it. The wizard defines what a complete
   * credentialing profile is, and a screen that let you save less would quietly undo that.
   */
  readonly form = new FormGroup({
    title: new FormControl<string>('', { nonNullable: false }),
    firstName: new FormControl<string>('', { nonNullable: true }),
    middleNames: new FormControl<string>('', { nonNullable: true }),
    lastName: new FormControl<string>('', { nonNullable: true }),
    email: new FormControl<string>('', { nonNullable: true }),
    birthDate: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    // Typed by the enums profile.md specifies (F9) rather than by `string`: a value outside either
    // enumeration is refused by the server with a 400, so a form that could hold one would be a
    // form that could only fail on save. `Sex | ''` because an untouched select is empty and `''`
    // is not a member — which is also what `Validators.required` is checking.
    sex: new FormControl<Sex | ''>('', { nonNullable: true, validators: Validators.required }),
    mobilePhone: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    cardType: new FormControl<PersonalDocumentType>(PersonalDocumentType.GHANACARD, {
      nonNullable: true,
      validators: Validators.required,
    }),
    cardNumber: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),

    digitalAddress: new FormControl<string>('', { nonNullable: true }),
    streetAddress: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    town: new FormControl<string>('', { nonNullable: true }),
    city: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    district: new FormControl<string>('', { nonNullable: true }),
    region: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    country: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),

    contactName: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    contactRelationship: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    contactPhone: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
  });

  ngOnInit(): void {
    this.load();
    this.accountService.identity().subscribe(account => this.currentUser.set(account));
  }

  load(): void {
    this.loadState.set('loading');
    this.api.getOwnProfile().subscribe({
      next: profile => {
        this.loaded = profile;
        this.prefill(profile);
        this.loadState.set('ready');
      },
      error: err => {
        // 404 is "no profile yet", not a failure — show the empty form so it can be created.
        if (err?.status === 404) {
          this.loaded = null;
          this.loadState.set('ready');
        } else {
          this.loadState.set('error');
        }
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.api.upsertProfile(this.buildPayload()).subscribe({
      next: profile => {
        this.loaded = profile;
        this.prefill(profile);
        this.saving.set(false);
        this.alertService.showToast('healthConnect.profile.clinical.saved');
        // Personal details, address and next of kin are three of the eight requirements, so the
        // meter has to move on save; one that only updated on reload would read as broken.
        this.progressService.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  private prefill(profile: OnboardingProfileDto): void {
    this.form.patchValue({
      title: profile.title ?? '',
      firstName: profile.firstName ?? this.currentUser()?.firstName ?? '',
      middleNames: profile.middleNames ?? '',
      lastName: profile.lastName ?? this.currentUser()?.lastName ?? '',
      email: profile.email ?? this.currentUser()?.email ?? '',
      birthDate: profile.birthDate ?? '',
      sex: profile.sex ?? '',
      mobilePhone: profile.mobilePhone ?? '',
      cardType: profile.cardType ?? PersonalDocumentType.GHANACARD,
      cardNumber: profile.cardNumber ?? '',

      digitalAddress: profile.address?.digitalAddress ?? '',
      streetAddress: profile.address?.streetAddress ?? '',
      town: profile.address?.town ?? '',
      city: profile.address?.city ?? '',
      district: profile.address?.district ?? '',
      region: profile.address?.region ?? '',
      country: profile.address?.country ?? '',

      contactName: profile.emergencyContact?.name ?? '',
      contactRelationship: profile.emergencyContact?.relationship ?? '',
      contactPhone: profile.emergencyContact?.phone ?? '',
    });
  }

  /**
   * Spread the loaded profile first so the fields this form does not show — name, middle names,
   * email, and the server-assigned ids — survive the round trip untouched.
   */
  private buildPayload(): OnboardingProfileDto {
    const value = this.form.getRawValue();
    return {
      ...this.loaded,
      title: value.title || null,
      firstName: value.firstName || (this.currentUser()?.firstName ?? null),
      lastName: value.lastName || (this.currentUser()?.lastName ?? null),
      email: value.email || (this.currentUser()?.email ?? null),
      birthDate: value.birthDate || null,
      sex: value.sex || null,
      mobilePhone: value.mobilePhone || null,
      cardType: value.cardType || null,
      cardNumber: value.cardNumber || null,
      address: {
        digitalAddress: value.digitalAddress || null,
        streetAddress: value.streetAddress || null,
        town: value.town || null,
        city: value.city || null,
        district: value.district || null,
        region: value.region || null,
        country: value.country || null,
      },
      emergencyContact: {
        name: value.contactName || null,
        relationship: value.contactRelationship || null,
        phone: value.contactPhone || null,
      },
    };
  }
}
