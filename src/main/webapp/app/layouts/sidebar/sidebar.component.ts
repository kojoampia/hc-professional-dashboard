import { Component, EventEmitter, Inject, Input, OnInit, Output, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslateService } from '@ngx-translate/core';

import { StateStorageService } from 'app/core/auth/state-storage.service';
import SharedModule from 'app/shared/shared.module';
import { VERSION } from 'app/app.constants';
import { LANGUAGES } from 'app/config/language.constants';
import { Account } from 'app/core/auth/account.model';
import { AccountService } from 'app/core/auth/account.service';
import { LoginService } from 'app/login/login.service';
import { ProfileService } from 'app/layouts/profiles/profile.service';
import ActiveMenuDirective from './active-menu.directive';
import { resolveAuthorityRole } from 'app/health-connect/authority-role';
import { HEALTH_CONNECT_REPOSITORY, HealthConnectRepository } from 'app/health-connect/health-connect.repository';
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
  @Output() closeRequest = new EventEmitter<void>();

  inProduction?: boolean;
  readonly messagesApi = inject(MessagesApiService);
  languages = LANGUAGES;
  version = '';
  account: Account | null = null;
  navGroups = SHELL_NAV_GROUPS;

  constructor(
    private loginService: LoginService,
    private translateService: TranslateService,
    private stateStorageService: StateStorageService,
    private accountService: AccountService,
    private profileService: ProfileService,
    private router: Router,
    @Inject(HEALTH_CONNECT_REPOSITORY) private healthConnectRepository: HealthConnectRepository,
  ) {
    if (VERSION) {
      this.version = VERSION.toLowerCase().startsWith('v') ? VERSION : `v${VERSION}`;
    }
  }

  ngOnInit(): void {
    this.profileService.getProfileInfo().subscribe(profileInfo => {
      this.inProduction = profileInfo.inProduction;
    });

    this.accountService.getAuthenticationState().subscribe(account => {
      this.account = account;
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
    return this.account ? this.healthConnectRepository.shiftLabelForAccount(this.account.login) : null;
  }
}
