import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslateService } from '@ngx-translate/core';

import { StateStorageService } from 'app/core/auth/state-storage.service';
import SharedModule from 'app/shared/shared.module';
import { LANGUAGES } from 'app/config/language.constants';
import { Account } from 'app/core/auth/account.model';
import { AccountService } from 'app/core/auth/account.service';
import { LoginService } from 'app/login/login.service';
import { ProfileService } from 'app/layouts/profiles/profile.service';
import ActiveMenuDirective from './active-menu.directive';
import { hasClinicalAuthority, resolveAuthorityRole } from 'app/health-connect/authority-role';
import { DutyRosterAssignmentsService } from 'app/health-connect/api/duty-roster-assignments.service';
import { MessagesApiService } from 'app/health-connect/api/messages-api.service';
import { ShiftLabel } from 'app/health-connect/health-connect.models';
import { SHELL_NAV_GROUPS, ShellNavGroup, ShellNavItem } from './shell-navigation';

@Component({
  selector: 'hpd-sidebar',
  templateUrl: './sidebar.component.html',
  host: { class: 'contents' },
  imports: [RouterModule, SharedModule, ActiveMenuDirective, MatIconModule],
})
export default class SidebarComponent implements OnInit {
  /** Mobile off-canvas state; ignored on lg+ where the sidebar is always visible. */
  @Input() open = false;

  /**
   * Collapsed to an icon rail. <b>Desktop only</b> — every class it drives is `lg:`-prefixed, so a
   * phone still gets the full-width drawer whatever this says. A 50px rail on a phone would be a
   * second, worse navigation competing with the one that already works there.
   */
  @Input() collapsed = false;

  @Output() closeRequest = new EventEmitter<void>();

  /** Wide when open, 50px when collapsed. The mobile drawer keeps its own width regardless. */
  get railClass(): string {
    return this.collapsed ? 'lg:w-[50px] lg:px-1' : 'lg:w-[248px] lg:px-3.5';
  }

  /** Applied to every label the rail has no room for. Hidden at `lg` only, for the same reason. */
  get labelClass(): string {
    return this.collapsed ? 'lg:hidden' : '';
  }

  /** Centre the icons once the labels beside them are gone. */
  get rowClass(): string {
    return this.collapsed ? 'lg:justify-center lg:gap-0 lg:px-0' : '';
  }

  inProduction?: boolean;
  readonly messagesApi = inject(MessagesApiService);
  languages = LANGUAGES;
  account: Account | null = null;
  navGroups = SHELL_NAV_GROUPS;

  constructor(
    private loginService: LoginService,
    private translateService: TranslateService,
    private stateStorageService: StateStorageService,
    private accountService: AccountService,
    private profileService: ProfileService,
    private router: Router,
    private dutyRosterAssignments: DutyRosterAssignmentsService,
  ) {}

  ngOnInit(): void {
    this.profileService.getProfileInfo().subscribe(profileInfo => {
      this.inProduction = profileInfo.inProduction;
    });

    this.accountService.getAuthenticationState().subscribe(account => {
      this.account = account;
      if (account) {
        // WP6 gate: the user-card shift label is driven by real assignments.
        this.dutyRosterAssignments.loadMyAssignments();
      }
    });
  }

  badgeCount(item: ShellNavItem): number {
    return item.badge === 'unreadMessages' ? this.messagesApi.unreadCount() : 0;
  }

  visibleItems(group: ShellNavGroup): ShellNavItem[] {
    return group.items.filter(item => {
      if (item.unauthOnly) {
        return this.account === null;
      }
      if (item.requiresAuth) {
        return this.account !== null;
      }
      return true;
    });
  }

  groupVisible(group: ShellNavGroup): boolean {
    if (group.requiresAuth && this.account === null) {
      return false;
    }
    // An applicant holds only ROLE_USER, and every clinical destination refuses them. Hiding the
    // group is what lets onboarding live inside the portal at all — see ShellNavGroup.clinicalOnly.
    if (group.clinicalOnly && !hasClinicalAuthority(this.account?.authorities)) {
      return false;
    }
    if (group.authorities && !this.accountService.hasAnyAuthority(group.authorities)) {
      return false;
    }
    return this.visibleItems(group).length > 0;
  }

  changeLanguage(languageKey: string): void {
    this.stateStorageService.storeLocale(languageKey);
    this.translateService.use(languageKey);
  }

  requestClose(): void {
    this.closeRequest.emit();
  }

  login(): void {
    this.requestClose();
    this.router.navigate(['/login']);
  }

  logout(): void {
    this.requestClose();
    this.loginService.logout();
    this.router.navigate(['']);
  }

  get userInitials(): string {
    if (!this.account) {
      return '';
    }
    const first = this.account.firstName?.trim().charAt(0) ?? '';
    const last = this.account.lastName?.trim().charAt(0) ?? '';
    const initials = `${first}${last}`.toUpperCase();
    return initials || this.account.login.slice(0, 2).toUpperCase();
  }

  get userDisplayName(): string {
    if (!this.account) {
      return '';
    }
    const name = [this.account.firstName, this.account.lastName].filter(Boolean).join(' ').trim();
    return name || this.account.login;
  }

  get roleBadgeTranslationKey(): string | null {
    const role = resolveAuthorityRole(this.account?.authorities).primaryRole;
    return role ? `healthConnect.roles.${role.toLocaleLowerCase()}` : null;
  }

  get shiftLabel(): ShiftLabel | null {
    return this.account ? this.dutyRosterAssignments.shiftLabel() : null;
  }
}
