import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import SharedModule from 'app/shared/shared.module';
import { AlertService } from 'app/core/util/alert.service';
import { IDENTITY_TYPES, OnboardingApiService, OnboardingProfileDto } from 'app/health-connect/api/onboarding-api.service';

/**
 * The clinician's own credentialing profile, editable after approval.
 *
 * <p>Until now this data could only be entered once, inside the onboarding wizard, and the wizard
 * closes when the application is approved — so a clinician who moved house or changed their
 * emergency contact had no way to say so. Same endpoints as the wizard
 * ({@code GET/PUT /api/onboarding/profile}, both {@code .authenticated()} rather than clinical-role
 * gated), so this needs nothing new from {@code api/}.
 *
 * <p><b>Name and email are deliberately absent.</b> They exist here <i>and</i> on the gateway
 * account, and the account is the owner — it is what signs you in, what the sidebar card greets you
 * by, and what the account section above edits. Showing both would put the same three fields on one
 * page twice, with one save silently not affecting the other. What this section keeps is everything
 * the account has no concept of: title, birth date, sex, mobile, identity card, address, next of kin.
 *
 * <p>Because they are absent from the form and {@code upsertProfile} replaces the whole document,
 * {@link #save} merges over the profile it loaded rather than sending the form alone — otherwise
 * saving an address here would blank the name the credentialing record is filed under. That is the
 * one failure this component is most exposed to, and {@code clinical-profile.component.spec.ts}
 * pins it.
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

  readonly identityTypes = IDENTITY_TYPES;
  readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly saving = signal(false);

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
    title: new FormControl<string>('', { nonNullable: true }),
    birthDate: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    sex: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    mobilePhone: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    cardType: new FormControl<string>('GHANACARD', { nonNullable: true, validators: Validators.required }),
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
      },
      error: () => this.saving.set(false),
    });
  }

  private prefill(profile: OnboardingProfileDto): void {
    this.form.patchValue({
      title: profile.title ?? '',
      birthDate: profile.birthDate ?? '',
      sex: profile.sex ?? '',
      mobilePhone: profile.mobilePhone ?? '',
      cardType: profile.cardType ?? 'GHANACARD',
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
