import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import SharedModule from 'app/shared/shared.module';
import { AlertService } from 'app/core/util/alert.service';
import { Account } from 'app/core/auth/account.model';
import { AccountService } from 'app/core/auth/account.service';
import { IDENTITY_TYPES } from 'app/health-connect/api/onboarding-api.service';
import { OnboardingProgressService } from 'app/onboarding/onboarding-progress.service';
import { WizardService, storeWizardProfileId } from 'app/onboarding/wizard.service';
import { ADDRESS_INPUT_FIELDS, Address, AddressInputField } from 'app/entities/address/model';
import { CONTACT_INPUT_FIELDS, ContactInputField, REQUIRED_CONTACTS } from 'app/entities/emergency-contact/model';
import { PersonalDocumentType } from 'app/entities/personal-document/types.enum';
import WizardFooterComponent from 'app/shared/health-connect/wizard/wizard-footer.component';
import { PROFILE_INPUT_FIELDS, Profile, ProfileInputField } from './model';
import { ProfileService } from './service';
import { SEXES, Sex } from './sex.enum';

/**
 * The pane's sections, in render order — and the unit its validation feedback is grouped by.
 *
 * <p>⚠ **`contacts` is one section holding N sub-forms**, not one section per contact: the count of
 * contacts is the applicant's to choose above the minimum, so a section list derived from it would
 * grow as they type.
 */
export const PROFILE_SECTIONS = ['identity', 'personal', 'address', 'contacts'] as const;

export type ProfileSection = (typeof PROFILE_SECTIONS)[number];

/** Which `Profile` scalar is optional. One, and the specification is why — see the model's note. */
const OPTIONAL_PROFILE_FIELDS: readonly string[] = ['title'];

/**
 * **Step 2 — create the profile** (`profile.md:183-202`), as the wizard's second pane.
 *
 * <h2>⚠ Thirty-six required inputs in one dialog, and the layout is the answer to that</h2>
 *
 * <p>`profile-addendum.md` § 3 T8 counts them: 7 profile scalars + 7 address fields + 2 × 11 on the
 * contacts, plus the 4 prefilled read-only ones — and warns that *"a pane that cannot be saved until
 * 36 fields validate is the one most likely to make 'each step opens only after the previous one has
 * saved successfully' feel like a wall."* Three decisions answer it, and they are this component's
 * only real design content:
 *
 * <ul>
 *   <li><b>Four sections, validated per section.</b> {@link PROFILE_SECTIONS} is the unit, and
 *       {@link outstandingBySection} counts what each still needs. The server's own refusal is
 *       grouped the same way — `ProfileCompleteness.missingRequirements` answers **three keys, not
 *       39**, because *"which of the eleven values inside a contact is missing is the form's to show,
 *       not the refusal's"*. So the grouping is read off the specification rather than invented.</li>
 *   <li><b>A navigable summary, not a wall.</b> {@link outstandingSummary} renders one row per
 *       section with its count and an in-page link, so "nine things missing" becomes "three in your
 *       address, six across your next of kin" with somewhere to click. ⛔ A flat list of 36 field
 *       names was the alternative and is the wall the addendum names.</li>
 *   <li><b>Quiet until engaged.</b> The summary appears once the applicant has edited something or
 *       had a save refused, never on arrival — the rule `ClinicalProfileComponent` settled and the
 *       reason it patches with `emitEvent: false`: *"greeting someone with a list of complaints about
 *       a form they have not touched reads as an error."*</li>
 * </ul>
 *
 * <h2>Two contacts minimum, with a ✚ for more</h2>
 *
 * <p>`profile.md:196`. {@link REQUIRED_CONTACTS} is **2**, a figure corrected by conformance finding
 * F2 after the predicate shipped accepting one, and `api/OnboardingService.REQUIRED_CONTACTS` is the
 * gate that actually refuses a submission. The pane opens with two blank contact forms for a new
 * profile and will not remove below two — ⚠ removal is offered only above the minimum, because a
 * remove button that refuses is worse than one that is absent.
 *
 * <h2>⛔ Why this writes `contacts` and `ClinicalProfileComponent` writes `emergencyContact`</h2>
 *
 * <p>Both call `PUT /api/profile` and the two bodies are different shapes of the same document: this
 * one names the real `contacts` list, the tab names the deprecated singular alias projecting
 * `contacts[0]` that retires in T6. The full argument — including why widening the tab's DTO instead
 * would break `backlog.md` row 230's compile-time gate — is on {@link Profile}. The write is a
 * **partial update**, so the two cannot blank each other's fields, and `contacts` wins if a body
 * carries both.
 *
 * <h2>The four prefilled fields are read-only and `accountId` is not even sent</h2>
 *
 * <p>`profile.md:187-194` prefills `accountId`, `firstName`, `lastName` and `email` from the account
 * and makes them read-only. ⚠ **`accountId` is shown and never written**: it is
 * `@JsonProperty(access = READ_ONLY)` server-side and forced from the token, so there is no body that
 * reaches another account's row. The other three are sent, because they are stored on the profile too
 * and a new profile needs them.
 */
@Component({
  standalone: true,
  selector: 'hpd-profile-update',
  imports: [SharedModule, ReactiveFormsModule, WizardFooterComponent],
  templateUrl: './profile-update.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ProfileUpdateComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly accountService = inject(AccountService);
  private readonly alertService = inject(AlertService);
  private readonly progressService = inject(OnboardingProgressService);
  private readonly wizard = inject(WizardService);

  readonly sections = PROFILE_SECTIONS;
  readonly identityTypes = IDENTITY_TYPES;
  readonly sexes = SEXES;
  readonly addressFields = ADDRESS_INPUT_FIELDS;
  readonly contactFields = CONTACT_INPUT_FIELDS;
  readonly requiredContacts = REQUIRED_CONTACTS;

  readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly saving = signal(false);
  readonly account = signal<Account | null>(null);

  /** The row as the server last gave it, kept so ids and unshown fields survive the round trip. */
  /**
   * ⚠ **A signal, and it was a plain field until review.** {@link accountId} is a `computed` over it,
   * and a computed cannot track an ordinary property: the value was read once at construction and
   * stayed `''` for a new applicant **even after the first save returned the real `accountId`**, so
   * the read-only Account field on screen was permanently blank for exactly the people step 2 is for.
   * Nothing failed — the field is read-only, so no write was wrong — which is why it needed the
   * rendered assertion the spec now carries beside it.
   */
  private readonly loadedProfile = signal<Profile | null>(null);

  readonly form = new FormGroup({
    // Offered and optional — the one Profile scalar ProfileCompleteness excludes. See the model.
    title: new FormControl<string>('', { nonNullable: true }),
    middleNames: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    birthDate: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    // `Sex | ''` because an untouched select is '' and '' is not a member — which is also what
    // Validators.required checks. Typed by the enum profile.md names (F9): a free-text sex stored
    // {"sex":"banana"} and answered 200.
    sex: new FormControl<Sex | ''>('', { nonNullable: true, validators: [Validators.required] }),
    mobilePhone: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    phoneNumber: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    cardType: new FormControl<PersonalDocumentType | ''>('', { nonNullable: true, validators: [Validators.required] }),
    cardNumber: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    address: addressGroup(),
    contacts: new FormArray<ReturnType<typeof contactGroup>>([]),
  });

  /** Recomputed as the applicant types, so the section counts follow the form. */
  private readonly edits = toSignal(this.form.valueChanges, { initialValue: null });

  /** Set when Save was refused for an incomplete form, so the gaps appear without an edit. */
  private readonly saveRefused = signal(false);

  readonly contacts = computed(() => {
    this.edits();
    return this.form.controls.contacts.controls;
  });

  /**
   * How many required values each section still wants.
   *
   * <p>Counted from the controls' own validity rather than from a second list of field names: the
   * validators are declared once, on the controls, so there is nothing here to drift from them. ⚠ The
   * `identity` section is always 0 — its four fields are prefilled and read-only — and is kept in the
   * record so the section list is the whole pane rather than the parts that can fail.
   */
  readonly outstandingBySection = computed<Record<ProfileSection, number>>(() => {
    this.edits();
    const value = this.form.getRawValue() as Record<string, unknown>;
    const personal = PROFILE_INPUT_FIELDS.filter(field => !OPTIONAL_PROFILE_FIELDS.includes(field) && !provided(value[field])).length;
    const address = ADDRESS_INPUT_FIELDS.filter(field => !provided((value.address as Record<string, unknown>)[field])).length;
    const contacts = this.form.controls.contacts.controls.reduce((total, group) => total + incompleteCount(group), 0);
    return { identity: 0, personal, address, contacts };
  });

  readonly outstandingSummary = computed(() =>
    PROFILE_SECTIONS.map(section => ({ section, count: this.outstandingBySection()[section] })).filter(row => row.count > 0),
  );

  readonly outstandingTotal = computed(() => this.outstandingSummary().reduce((total, row) => total + row.count, 0));

  readonly showGaps = computed(() => (this.edits() !== null || this.saveRefused()) && this.outstandingTotal() > 0);

  readonly accountId = computed(() => this.loadedProfile()?.accountId ?? '');

  ngOnInit(): void {
    this.progressService.load();
    this.accountService.identity().subscribe(account => {
      this.account.set(account);
      this.wizard.setAccount(account);
      this.prefillFromAccount();
    });
    this.load();
  }

  load(): void {
    this.loadState.set('loading');
    this.profileService.find().subscribe({
      next: profile => {
        this.loadedProfile.set(profile);
        this.prefill(profile);
        this.loadState.set('ready');
      },
      error: err => {
        // 404 is "no profile yet", which is step 2's whole purpose: an applicant has an account
        // before they have a profile, and PUT /api/profile creates on first write.
        if (err?.status === 404) {
          this.loadedProfile.set(null);
          this.ensureMinimumContacts();
          this.loadState.set('ready');
        } else {
          this.loadState.set('error');
        }
      },
    });
  }

  /** Appends a blank next of kin — `profile.md:196`'s ✚ button. */
  addContact(): void {
    this.form.controls.contacts.push(contactGroup());
  }

  /**
   * Removes one, never below {@link REQUIRED_CONTACTS}.
   *
   * <p>⚠ Guarded here as well as hidden in the template: a guard in one place only is how a disabled
   * control reached by keyboard still fires.
   */
  removeContact(index: number): void {
    if (this.form.controls.contacts.length <= REQUIRED_CONTACTS) {
      return;
    }
    this.form.controls.contacts.removeAt(index);
  }

  removable(): boolean {
    return this.form.controls.contacts.length > REQUIRED_CONTACTS;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.saveRefused.set(true);
      return;
    }
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    this.profileService.update(this.buildPayload()).subscribe({
      next: profile => {
        this.loadedProfile.set(profile);
        this.prefill(profile);
        this.saving.set(false);
        this.saveRefused.set(false);
        this.alertService.showToast('healthConnect.onboarding.wizard.toast.profileSaved');
        // Three of the nine requirements move on this save, so the meter has to be re-read or it
        // reads as broken — and the footer's Next is gated on it.
        this.progressService.refresh();
        // profile.md:202 — "keep the saved profile in session storage and open the next dialog".
        // The open is the applicant's (Next); the store is here, because this is where the id is.
        //
        // ⛔ THE ID, not the profile. This passed the whole saved document — 39 fields including the
        // identity-document number and both next of kin's home addresses — into sessionStorage, which
        // is both more than step 3 reads and more than anything should leave behind on a shared
        // device. The argument is on storeWizardProfileId.
        storeWizardProfileId(profile.id);
      },
      error: () => this.saving.set(false),
    });
  }

  private prefill(profile: Profile): void {
    const contacts = this.form.controls.contacts;
    contacts.clear({ emitEvent: false });
    for (const contact of profile.contacts ?? []) {
      contacts.push(contactGroup(), { emitEvent: false });
      contacts.at(contacts.length - 1).patchValue(
        {
          id: contact.id ?? '',
          name: contact.name ?? '',
          relationship: contact.relationship ?? '',
          email: contact.email ?? '',
          phone: contact.phone ?? '',
          address: blankToEmpty(contact.address),
        },
        { emitEvent: false },
      );
    }
    this.ensureMinimumContacts();

    // emitEvent: false — loading the stored profile is not the applicant editing it, and counting it
    // as one puts the gap summary on screen the instant the pane opens.
    this.form.patchValue(
      {
        title: profile.title ?? '',
        middleNames: profile.middleNames ?? '',
        birthDate: profile.birthDate ?? '',
        sex: profile.sex ?? '',
        mobilePhone: profile.mobilePhone ?? '',
        phoneNumber: profile.phoneNumber ?? '',
        cardType: profile.cardType ?? '',
        cardNumber: profile.cardNumber ?? '',
        address: blankToEmpty(profile.address),
      },
      { emitEvent: false },
    );
    this.prefillFromAccount();
  }

  /** The three account-sourced names a new profile needs, shown read-only. */
  private prefillFromAccount(): void {
    const account = this.account();
    if (!account) {
      return;
    }
    const loaded = this.loadedProfile();
    this.loadedProfile.set({
      ...loaded,
      firstName: loaded?.firstName ?? account.firstName ?? null,
      lastName: loaded?.lastName ?? account.lastName ?? null,
      email: loaded?.email ?? account.email,
    });
  }

  private ensureMinimumContacts(): void {
    while (this.form.controls.contacts.length < REQUIRED_CONTACTS) {
      this.form.controls.contacts.push(contactGroup(), { emitEvent: false });
    }
  }

  /**
   * ⚠ Spread the loaded row first so ids and anything this pane does not show survive the round
   * trip. The write is a partial update, so this is no longer the guard against data loss it once
   * was — but `contacts` is a whole-list field, and a list sent without its ids would strand them.
   */
  private buildPayload(): Profile {
    const value = this.form.getRawValue();
    const account = this.account();
    const loaded = this.loadedProfile();
    return {
      ...loaded,
      title: value.title || null,
      firstName: loaded?.firstName ?? account?.firstName ?? null,
      middleNames: value.middleNames || null,
      lastName: loaded?.lastName ?? account?.lastName ?? null,
      email: loaded?.email ?? account?.email ?? null,
      birthDate: value.birthDate || null,
      sex: value.sex || null,
      mobilePhone: value.mobilePhone || null,
      phoneNumber: value.phoneNumber || null,
      cardType: value.cardType || null,
      cardNumber: value.cardNumber || null,
      address: emptyToNull(value.address),
      contacts: value.contacts.map(contact => ({
        id: contact.id || null,
        name: contact.name || null,
        relationship: contact.relationship || null,
        email: contact.email || null,
        phone: contact.phone || null,
        address: emptyToNull(contact.address),
      })),
      // Never sent: the server refuses a body naming it and stamps it itself. Spreading `loaded`
      // would carry it back, so it is cleared explicitly rather than left to the spread.
      status: undefined,
      accountId: undefined,
    };
  }
}

/**
 * The two sub-form shapes, named rather than inferred.
 *
 * <p>⚠ **Built by looping over the field arrays, not written out field by field.** The arrays are the
 * same ones {@link outstandingBySection} counts and the same ones the template iterates to render the
 * inputs, so the controls, the gap count and the markup cannot disagree about which fields exist —
 * and the models' own `…AreExhaustive` types fail the build if either array stops covering its
 * interface. Writing seven controls out by hand, in two places, is how the three come apart.
 */
type AddressControls = Record<AddressInputField, FormControl<string>>;

type ContactControls = Record<ContactInputField, FormControl<string>> & {
  /** The server's id, carried as a hidden control so a round trip does not strand it. Never typed. */
  id: FormControl<string>;
  address: FormGroup<AddressControls>;
};

/** One address sub-form: the seven inputs, every one required. */
function addressGroup(): FormGroup<AddressControls> {
  const controls = {} as AddressControls;
  for (const field of ADDRESS_INPUT_FIELDS) {
    controls[field] = new FormControl<string>('', { nonNullable: true, validators: [Validators.required] });
  }
  return new FormGroup(controls);
}

/**
 * One next of kin: four required scalars, a nested required address, and the carried id.
 *
 * <p>`Validators.email` on the email as well as `required` — an address that cannot be written to is
 * not a next of kin anybody can reach, and the server stores whatever text arrives.
 */
function contactGroup(): FormGroup<ContactControls> {
  const controls = {} as ContactControls;
  controls.id = new FormControl<string>('', { nonNullable: true });
  for (const field of CONTACT_INPUT_FIELDS) {
    controls[field] = new FormControl<string>('', {
      nonNullable: true,
      validators: field === 'email' ? [Validators.required, Validators.email] : [Validators.required],
    });
  }
  controls.address = addressGroup();
  return new FormGroup(controls);
}

/** How many required values a contact sub-form still wants, across its scalars and its address. */
function incompleteCount(group: AbstractControl): number {
  const value = group.getRawValue() as Record<string, unknown>;
  const scalars = CONTACT_INPUT_FIELDS.filter(field => !provided(value[field])).length;
  const address = ADDRESS_INPUT_FIELDS.filter(field => !provided((value.address as Record<string, unknown>)[field])).length;
  return scalars + address;
}

/**
 * "Provided", in the one sense this pane has — the client-side reading of
 * `ProfileCompleteness.hasText`.
 *
 * <p>A blank or whitespace-only string is what an untouched input posts, so counting it would make
 * the pane satisfiable by saving an empty form. Deliberately the **same** predicate
 * `onboarding/profile-requirements.ts` exports, restated rather than imported: that file is
 * `backlog.md` row 230's and partitions a *different* wire model, and importing one function from it
 * would couple this pane to a gate it must not reach into.
 */
function provided(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined;
}

/** A stored address as form values — every absent field a blank string the controls can hold. */
function blankToEmpty(address: Address | null | undefined): Record<AddressInputField, string> {
  const value = {} as Record<AddressInputField, string>;
  for (const field of ADDRESS_INPUT_FIELDS) {
    value[field] = address?.[field] ?? '';
  }
  return value;
}

/**
 * Form values as a stored address — every blank string a null, which is what "absent" means here.
 *
 * <p>⚠ `id` is deliberately absent from the result: it is the `@Id` of an embedded
 * `@Document(collection = "address")`, the form never collects it, and the server assigns it. The
 * loaded row's own id is carried by the spread of `loadedProfile()` on the profile, not through here.
 */
function emptyToNull(value: Record<AddressInputField, string>): Address {
  const address: Address = {};
  for (const field of ADDRESS_INPUT_FIELDS) {
    address[field] = value[field] || null;
  }
  return address;
}
