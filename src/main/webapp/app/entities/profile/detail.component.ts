import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import dayjs from 'dayjs/esm';

import SharedModule from 'app/shared/shared.module';
import AccountAvatarComponent from 'app/account/user/account-avatar.component';
import { Account } from 'app/core/auth/account.model';
import { AccountService } from 'app/core/auth/account.service';
import { Address } from 'app/entities/address/model';
import { OnboardingApiService, OnboardingApplicationDto, OnboardingDocumentDto } from 'app/health-connect/api/onboarding-api.service';
import { AuthorityRole } from 'app/health-connect/health-connect.models';
import { resolveAuthorityRole } from 'app/health-connect/authority-role';

import { PROFILE_STATUS_VALUES, Profile } from './model';
import { ProfileService } from './service';

/** How far a read has got; `empty` is the 404 the services treat as ordinary, not a failure. */
type ReadState = 'loading' | 'ready' | 'empty' | 'error';

/**
 * The header's authority cell — `profile.md:121`'s third column, as Q31 settled it.
 *
 * <p>`requested` decides which rendering the template uses: a granted authority is shown as itself,
 * a requested one only through `healthConnect.profile.detail.requestedRole`, which wraps the role in
 * an explicit qualifier. The two must never collapse into one rendering — see {@link
 * ProfileDetailComponent#authorityBadge}.
 */
export interface AuthorityBadge {
  labelKey: string;
  requested: boolean;
}

/**
 * The My Profile read view — `profile.md` § Profile detail view, built by T9 and serving
 * `/account/profile` (Q2: the existing route, re-pointed).
 *
 * <p>Five sections over three sources (`profile-addendum.md` § 3 T9): the **account** (gateway —
 * `langKey`, `imageUrl`, `login`, `authorities`), the **profile** (`GET /api/profile` through
 * {@link ProfileService}, the client that speaks `contacts` rather than the deprecated singular
 * alias), and the **application** (`GET /api/professional-application/me` through
 * {@link OnboardingApiService}) for section 5's consent statement. Each source loads and fails
 * independently, so a dead application read costs the consent sentence and not the page.
 *
 * <h2>Q31 — whose authority does the header show? (owner, 2026-10-16)</h2>
 *
 * <p><b>The granted authority — the account's — and the requested role only with an explicit
 * "requested" qualifier.</b> Two shapes were argued and rejected. Rendering the requested role as
 * though it were granted makes the screen assert a capability the token does not carry — an
 * applicant would read "Nurse" over a profile the portal refuses nursing rights to. Rendering only
 * the granted authority leaves the header blank for the whole applicant period, which is most of the
 * wizard's life. The qualifier is therefore load-bearing, not decoration: dropping it turns the
 * truthful rendering into the rejected one.
 *
 * <h2>Section 3's previews are authenticated blobs, never bare image sources</h2>
 *
 * <p>`GET /api/personal-document/{id}/content` sits behind `assertOwnerOrReviewer` and needs the
 * `Authorization` header, so a plain `<img src>` gets a 401 and renders broken — the same reasoning
 * as {@link AccountAvatarComponent}, which renders section 2's photograph. `data` is nulled on the
 * list response, so every preview is a second request; each image blob becomes one object URL,
 * recorded per row and revoked on destroy. ⚠ On the quality stack the CSP blocks `blob:` images
 * (`backlog.md` row 244, not this component's to fix), so previews will not paint there until that
 * row closes — the code path is still the correct one.
 *
 * <h2>Section 5 renders a fact, not a fallback</h2>
 *
 * <p>"No application" (404) truthfully means no consent was ever recorded, so it renders the
 * not-consented sentence. A <em>failed</em> application read renders the error state instead —
 * telling a clinician they have not consented on the strength of a read that never arrived is the
 * "believed answer nothing established" failure this estate keeps closing.
 */
@Component({
  standalone: true,
  selector: 'hpd-profile-detail',
  imports: [SharedModule, AccountAvatarComponent],
  templateUrl: './detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ProfileDetailComponent implements OnInit, OnDestroy {
  private readonly accountService = inject(AccountService);
  private readonly profileService = inject(ProfileService);
  private readonly onboardingApi = inject(OnboardingApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly account = signal<Account | null>(null);
  readonly profile = signal<Profile | null>(null);
  readonly profileState = signal<ReadState>('loading');
  readonly application = signal<OnboardingApplicationDto | null>(null);
  readonly applicationState = signal<ReadState>('loading');
  readonly documents = signal<OnboardingDocumentDto[]>([]);
  readonly documentsState = signal<ReadState>('loading');

  /**
   * One object URL per document row: `undefined` while the bytes are still loading, `null` when
   * there is nothing to paint (a non-image document, or a failed read — the preview column is not
   * worth an error state of its own, which is {@link AccountAvatarComponent}'s reasoning too).
   */
  readonly previews = signal<Readonly<Record<string, string | null | undefined>>>({});

  /** Section 1's full name — the profile's, with the account as the applicant-period fallback. */
  readonly fullName = computed<string>(() => {
    const profile = this.profile();
    const account = this.account();
    const parts = profile ? [profile.firstName, profile.middleNames, profile.lastName] : [account?.firstName, account?.lastName];
    return parts.filter(Boolean).join(' ');
  });

  /**
   * Q31: the granted authority when the account holds one beyond a bare `ROLE_USER`; otherwise the
   * application's requested role, flagged `requested` so the template cannot render it unqualified;
   * otherwise nothing. `resolveAuthorityRole` returning `USER` for a role-less applicant — and
   * `null` for an authority this portal does not recognise, `ROLE_ANGEL` being the live case — is
   * exactly the distinction this leans on.
   */
  readonly authorityBadge = computed<AuthorityBadge | null>(() => {
    const granted = resolveAuthorityRole(this.account()?.authorities).primaryRole;
    if (granted && granted !== AuthorityRole.USER) {
      return { labelKey: `healthConnect.roles.${granted.toLowerCase()}`, requested: false };
    }
    const requested = this.application()?.authority;
    if (requested) {
      return { labelKey: `healthConnect.roles.${requested.replace('ROLE_', '').toLowerCase()}`, requested: true };
    }
    return null;
  });

  /**
   * The translation key for `profile.status`, or `null` for a value this build has no label for —
   * the template then renders the raw identifier rather than a literal `healthConnect.…` key
   * mid-screen, which is what ngx-translate does with a missing key.
   */
  readonly statusKey = computed<string | null>(() => {
    const status = this.profile()?.status;
    return status && (PROFILE_STATUS_VALUES as readonly string[]).includes(status)
      ? `healthConnect.profile.detail.profileStatus.${status}`
      : null;
  });

  /** Initials for the avatar fallback, from whichever name the header is showing. */
  readonly initials = computed<string>(() => {
    const account = this.account();
    const profile = this.profile();
    const first = profile?.firstName ?? account?.firstName ?? '';
    const last = profile?.lastName ?? account?.lastName ?? '';
    const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    return initials || (account?.login ?? '').charAt(0).toUpperCase();
  });

  ngOnInit(): void {
    this.accountService
      .identity()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(account => this.account.set(account));

    this.profileService
      .find()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: profile => {
          this.profile.set(profile);
          this.profileState.set('ready');
        },
        // 404 is the ordinary no-profile-yet state (the service already opts it out of the global
        // error banner); anything else is a failure and must not render as an empty profile.
        error: (error: { status?: number }) => this.profileState.set(error.status === 404 ? 'empty' : 'error'),
      });

    this.onboardingApi
      .getOwnApplication()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: application => {
          this.application.set(application);
          this.applicationState.set('ready');
        },
        // 404 means "no application", normal for every invited clinician — section 5's else-branch
        // is the truthful rendering of it. A failed read is NOT "not consented"; see the class note.
        error: (error: { status?: number }) => this.applicationState.set(error.status === 404 ? 'empty' : 'error'),
      });

    this.onboardingApi
      .listDocuments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: documents => {
          this.documents.set(documents);
          this.documentsState.set('ready');
          this.loadPreviews(documents);
        },
        error: () => this.documentsState.set('error'),
      });
  }

  /**
   * Revokes every object URL this page created. Not housekeeping: each `createObjectURL` pins its
   * blob in memory until revoked, and section 3 creates one per document on every visit.
   */
  ngOnDestroy(): void {
    for (const url of Object.values(this.previews())) {
      if (url) {
        URL.revokeObjectURL(url);
      }
    }
  }

  /** Section 5's interpolation — the consent date, formatted in the active dayjs locale. */
  consentParams(): { date: string } {
    return { date: this.formatDate(this.application()?.agreedDate) };
  }

  /**
   * `D MMM YYYY` in the active locale — `dayjs.locale()` follows the language switcher
   * (`main.component.ts`), so the month name is the locale's, matching `FormatMediumDatePipe`.
   */
  formatDate(value?: string | null): string {
    return value ? dayjs(value).format('D MMM YYYY') : '';
  }

  /** The seven address parts on one line, in the order `profile.md`'s Address model lists them. */
  formatAddress(address?: Address | null): string {
    return [
      address?.digitalAddress,
      address?.streetAddress,
      address?.town,
      address?.city,
      address?.district,
      address?.region,
      address?.country,
    ]
      .filter(Boolean)
      .join(', ');
  }

  /**
   * One `GET …/{id}/content` per row. Through `documentContent` so the auth interceptor attaches the
   * token; silenced because a preview that cannot paint falls back to its placeholder rather than
   * putting a banner over a page that is otherwise working — one banner per failing row would be
   * five. `takeUntilDestroyed` also aborts in-flight reads on destroy, so no blob can arrive with
   * nobody left to revoke its URL.
   */
  private loadPreviews(documents: OnboardingDocumentDto[]): void {
    for (const document of documents) {
      this.onboardingApi
        .documentContent(document.id, { silent: true })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: blob => this.adoptPreview(document.id, blob),
          error: () => this.adoptPreview(document.id, null),
        });
    }
  }

  /** An object URL for an image blob; `null` — the placeholder — for anything else. */
  private adoptPreview(id: string, blob: Blob | null): void {
    const url = blob && blob.type.startsWith('image/') ? URL.createObjectURL(blob) : null;
    this.previews.update(previews => ({ ...previews, [id]: url }));
  }
}
