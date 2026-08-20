import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import SharedModule from 'app/shared/shared.module';
import { OnboardingProgressService } from 'app/core/onboarding/onboarding-progress.service';
import SettingsComponent from 'app/account/settings/settings.component';
import PasswordComponent from 'app/account/password/password.component';
import ClinicalProfileComponent from './clinical-profile.component';
import CompletionMeterComponent from './completion-meter.component';
import DocumentsTabComponent from './documents-tab.component';
import ApplicationTabComponent from './application-tab.component';

export type ProfileTab = 'account' | 'clinical' | 'documents' | 'application' | 'password';

/**
 * Left to right, this is the order an applicant meets them in: apply, describe yourself, upload the
 * evidence — then the account and password settings, which are housekeeping rather than
 * credentialing and are the same for everyone. The array is the single source of that order: the
 * nav renders from it and the panel `@switch` keys off the selected id, so nothing else needs
 * touching to reorder them.
 */
const TABS: { id: ProfileTab; labelKey: string }[] = [
  { id: 'application', labelKey: 'healthConnect.profile.application.title' },
  { id: 'clinical', labelKey: 'healthConnect.profile.clinical.title' },
  { id: 'documents', labelKey: 'healthConnect.profile.documents.title' },
  { id: 'account', labelKey: 'healthConnect.profile.account.title' },
  { id: 'password', labelKey: 'healthConnect.profile.password.title' },
];

/**
 * Everything about you, in one place: application, credentialing profile, documents, account,
 * password — with the server's completion figure above them all.
 *
 * <p>This replaces the separate {@code /onboarding} wizard. The wizard's steps were a sequence you
 * walked once and could never revisit, which is why a clinician who changed address had nowhere to
 * go; as tabs they are all reachable, in any order, before and after approval. The requirements are
 * unchanged — the server still decides what complete means.
 *
 * <p>The active tab lives in the query string rather than in component state so that the meter's
 * "licence still needed" and a deep link from elsewhere can both land on the right tab, and so the
 * browser's back button steps between tabs the way people expect.
 *
 * <p>Tabs are kept mounted only when selected. Documents and Application each fetch on init, and
 * rendering all five at once would fire every request on arrival for a page where most visitors
 * only ever open one.
 */
@Component({
  standalone: true,
  selector: 'hpd-profile-page',
  imports: [
    SharedModule,
    SettingsComponent,
    ClinicalProfileComponent,
    CompletionMeterComponent,
    DocumentsTabComponent,
    ApplicationTabComponent,
    PasswordComponent,
  ],
  templateUrl: './profile-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ProfilePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly progressService = inject(OnboardingProgressService);

  readonly tabs = TABS;

  private readonly queryTab = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly fallback = signal<ProfileTab>('account');

  readonly activeTab = computed<ProfileTab>(() => {
    const requested = this.queryTab().get('tab');
    return TABS.some(tab => tab.id === requested) ? (requested as ProfileTab) : this.fallback();
  });

  ngOnInit(): void {
    this.progressService.load();
  }

  select(tab: ProfileTab): void {
    this.fallback.set(tab);
    // replaceUrl: switching tabs is not a navigation worth a history entry each time — otherwise
    // leaving the page takes as many back presses as tabs you looked at.
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, replaceUrl: true });
  }

  tabClass(tab: ProfileTab): string {
    return this.activeTab() === tab
      ? 'border-hpd-primary bg-white text-hpd-primary font-extrabold'
      : 'border-transparent text-hpd-muted hover:text-hpd-primary-dark';
  }
}
