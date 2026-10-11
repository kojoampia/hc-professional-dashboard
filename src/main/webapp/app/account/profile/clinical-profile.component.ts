import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import SharedModule from 'app/shared/shared.module';
import { AlertService } from 'app/core/util/alert.service';
import { OnboardingProgressService } from 'app/onboarding/onboarding-progress.service';
import { REQUIREMENT_FOR_GROUP, REQUIRED_CONTROLS, provided } from 'app/onboarding/profile-requirements';
import {
  IDENTITY_TYPES,
  ONBOARDING_REQUIREMENT_KEYS,
  OnboardingApiService,
  OnboardingProfileDto,
  OnboardingRequirementKey,
} from 'app/health-connect/api/onboarding-api.service';
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
   * The credentialing fields, with **no validators declared inline** — {@link requireEvery} applies
   * them from `REQUIRED_CONTROLS` (`backlog.md` row 230, unit B).
   *
   * <h2>⭐ Why the validators are applied from a list rather than written here</h2>
   *
   * <p>They used to be written inline, and — counted from the base commit rather than estimated —
   * **of 20 controls, 12 carried `Validators.required` and 8 did not**: `digitalAddress`, `town` and
   * `district`, on the strength of a comment about the server's *advisory* predicate that calls them
   * optional; `firstName`, `lastName`, `email` and `middleNames`, which have no input; and `title`,
   * which is genuinely optional. `profile.md` says *"every field in the Profile model is required"*,
   * and an inline list is exactly the arrangement that agrees with that today and quietly stops.
   *
   * <p>⚠ This paragraph said *"thirteen of the nineteen … while six did not"* and was wrong on both
   * numbers and omitted `title` and `middleNames` from the enumeration. The figures are now derived
   * from a parse of the file it describes.
   *
   * <p>So the required set is now **derived**: `onboarding/profile-requirements.ts` partitions the wire
   * model's fields by where each is entered, proves that partition exhaustive **against the DTO at
   * compile time**, and this form applies `Validators.required` to every field it names and to nothing
   * else. A field added to `OnboardingProfileDto` fails the build there; a control that loses its
   * validator fails the spec here.
   *
   * <p>⚠ **The control name is the model field name for all fifteen**, deliberately — the three contact
   * controls were `contactName`, `contactRelationship` and `contactPhone`, so a naming rule sat between
   * the form and the model and had to be got right by hand. There is now no mapping to get wrong.
   *
   * <p>⛔ **`firstName`, `lastName`, `email` and `middleNames` keep their controls and get no
   * validator**, which is the one asymmetry and it is argued in `profile-requirements.ts`: the first
   * three are the gateway account's and are prefilled from it, and `middleNames` has an input nowhere
   * in the estate. Requiring any of them would leave this form permanently invalid behind a disabled
   * Save button with nothing on screen to fix — worse than the defect being closed.
   */
  readonly form = this.requireEvery(
    new FormGroup({
      title: new FormControl<string>('', { nonNullable: false }),
      firstName: new FormControl<string>('', { nonNullable: true }),
      middleNames: new FormControl<string>('', { nonNullable: true }),
      lastName: new FormControl<string>('', { nonNullable: true }),
      email: new FormControl<string>('', { nonNullable: true }),
      birthDate: new FormControl<string>('', { nonNullable: true }),
      // Typed by the enums profile.md specifies (F9) rather than by `string`: a value outside either
      // enumeration is refused by the server with a 400, so a form that could hold one would be a
      // form that could only fail on save. `Sex | ''` because an untouched select is empty and `''`
      // is not a member — which is also what `Validators.required` is checking.
      sex: new FormControl<Sex | ''>('', { nonNullable: true }),
      mobilePhone: new FormControl<string>('', { nonNullable: true }),
      cardType: new FormControl<PersonalDocumentType>(PersonalDocumentType.GHANACARD, { nonNullable: true }),
      cardNumber: new FormControl<string>('', { nonNullable: true }),

      digitalAddress: new FormControl<string>('', { nonNullable: true }),
      streetAddress: new FormControl<string>('', { nonNullable: true }),
      town: new FormControl<string>('', { nonNullable: true }),
      city: new FormControl<string>('', { nonNullable: true }),
      district: new FormControl<string>('', { nonNullable: true }),
      region: new FormControl<string>('', { nonNullable: true }),
      country: new FormControl<string>('', { nonNullable: true }),

      name: new FormControl<string>('', { nonNullable: true }),
      relationship: new FormControl<string>('', { nonNullable: true }),
      phone: new FormControl<string>('', { nonNullable: true }),
    }),
  );

  /**
   * Whether the applicant has edited anything since the form was loaded.
   *
   * <p>⛔ **This only works because {@link prefill} patches with `emitEvent: false`**, and it did not
   * at first: `patchValue` emits by default, so loading a stored profile counted as an edit and
   * {@link showGaps} was `true` the instant the page arrived — the opposite of what this comment
   * claimed. ⚠ **And its guard could not see that**, because the guard stubbed the profile read to
   * **404** — the one path on which `prefill` never runs. A case that chose the scenario where the
   * layer under test is not reached. Both are fixed; the spec now loads a profile.
   */
  private readonly edits = toSignal(this.form.valueChanges, { initialValue: null });

  /**
   * Set when a save was refused for an incomplete form, so the gaps appear even if the applicant
   * pressed Save without touching a field — which is exactly what someone who thinks they have
   * finished does.
   */
  private readonly saveRefused = signal(false);

  /**
   * ⭐ **Which requirements this form's own inputs leave outstanding, recomputed as the applicant
   * types** — row 230's *"they should know all requirements and what gaps remain"*.
   *
   * <p>Grouped by the server's three requirement keys rather than listed as nineteen field names,
   * because those keys are what all four catalogues have labels for and what the meter above already
   * shows. `REQUIRED_CONTROLS` carries the group for each field, so the grouping is read rather than
   * repeated.
   *
   * <p>⚠ **This is the form's reading, not the server's verdict.** The meter stays authoritative; this
   * says what *would* be refused if Save were pressed now. The two can legitimately differ for a moment
   * — the applicant has typed something not yet saved — and when they do, this one is the useful one.
   */
  readonly outstandingRequirements = computed<OnboardingRequirementKey[]>(() => {
    // Read so the computed re-evaluates on every edit. `valueChanges` carries a partial value, so the
    // raw value is read from the form itself rather than from the emission.
    this.edits();
    const value = this.form.getRawValue() as Record<string, unknown>;
    const outstanding = new Set<string>(
      REQUIRED_CONTROLS.filter(control => !provided(value[control.field])).map(control => REQUIREMENT_FOR_GROUP[control.group]),
    );
    // Distinct, in the shared vocabulary's own order, so the chips do not reshuffle as fields are
    // filled in. Filtering the vocabulary rather than de-duplicating the hits is also what keeps the
    // order the same as the meter's requirement row above it.
    return ONBOARDING_REQUIREMENT_KEYS.filter(key => outstanding.has(key));
  });

  /**
   * The gap list appears once the applicant has engaged with the form — by editing it or by having a
   * save refused — and never on arrival.
   *
   * <p>Quiet on arrival is deliberate: greeting someone with a list of complaints about a form they
   * have not touched reads as an error, and the meter above already states what is outstanding
   * server-side. What this adds is *before the server sees it*, which only matters once they type.
   */
  readonly showGaps = computed(() => (this.edits() !== null || this.saveRefused()) && this.outstandingRequirements().length > 0);

  /**
   * Applies `Validators.required` to exactly the controls `REQUIRED_CONTROLS` names.
   *
   * <p>⛔ **Throws if a named field has no control**, which is the direction a spec cannot easily
   * cover: a field added to the partition in `profile-requirements.ts` and forgotten here would
   * otherwise silently go unvalidated. Failing at construction means the component cannot be
   * instantiated — every spec that touches it goes red at once, naming the field.
   */
  private requireEvery<T extends FormGroup>(form: T): T {
    for (const { field } of REQUIRED_CONTROLS) {
      const control = form.get(field);
      if (!control) {
        throw new Error(`profile-requirements.ts requires "${field}" and this form has no such control`);
      }
      control.addValidators(Validators.required);
      control.updateValueAndValidity({ emitEvent: false });
    }
    return form;
  }

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
      this.saveRefused.set(true);
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
    // `emitEvent: false`: loading or re-loading the stored profile is not the applicant editing it,
    // and counting it as one made the gap panel appear on arrival. See `edits`.
    this.form.patchValue(
      {
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

        name: profile.emergencyContact?.name ?? '',
        relationship: profile.emergencyContact?.relationship ?? '',
        phone: profile.emergencyContact?.phone ?? '',
      },
      { emitEvent: false },
    );
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
        name: value.name || null,
        relationship: value.relationship || null,
        phone: value.phone || null,
      },
    };
  }
}
