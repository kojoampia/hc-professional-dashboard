import { Component, HostListener, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterModule } from '@angular/router';

import { AccountService } from 'app/core/auth/account.service';
import { MessagesApiService } from 'app/health-connect/api/messages-api.service';
import SharedModule from 'app/shared/shared.module';
import FooterComponent from '../footer/footer.component';
import FirstLoginAcknowledgementComponent from 'app/health-connect/first-login/first-login-acknowledgement.component';
import SidebarComponent from '../sidebar/sidebar.component';
import TabbarComponent from '../tabbar/tabbar.component';
import { findShellNavItem } from '../sidebar/shell-navigation';

/**
 * The signed-in layout: sidebar, topbar, content, footer and the mobile tab bar.
 *
 * <p>Split out of {@link MainComponent}, which used to hold this chrome and therefore rendered it on
 * every screen including sign-in. The routes now choose between this and
 * {@code AuthShellComponent}, and this one is guarded as a whole — <b>there is no signed-out view
 * of the portal</b>, which is what stops a visitor reading a sidebar of destinations they cannot
 * open.
 *
 * <p>What stayed in {@code MainComponent} is what belongs to every screen rather than to this
 * frame: the environment ribbon, the toast outlet, automatic sign-in, and the language change that
 * updates dayjs and the {@code <html lang>} attribute.
 */
@Component({
  standalone: true,
  selector: 'hpd-shell',
  templateUrl: './shell.component.html',
  imports: [
    RouterModule,
    SharedModule,
    MatIconModule,
    FooterComponent,
    SidebarComponent,
    TabbarComponent,
    FirstLoginAcknowledgementComponent,
  ],
})
export default class ShellComponent implements OnInit {
  private static readonly COLLAPSED_KEY = 'hpd-sidebar-collapsed';

  sidebarOpen = false;
  /** Desktop icon-rail state. Persisted, because a preference that resets on every navigation is
   * not a preference. */
  sidebarCollapsed = false;
  crumbKey: string | null = null;
  titleKey = 'global.title';
  authenticated = false;

  readonly messagesApi = inject(MessagesApiService);

  constructor(
    private router: Router,
    private accountService: AccountService,
  ) {}

  ngOnInit(): void {
    this.sidebarCollapsed = localStorage.getItem(ShellComponent.COLLAPSED_KEY) === 'true';

    this.accountService.getAuthenticationState().subscribe(account => {
      this.authenticated = account !== null;
      this.syncPageHeader();
    });

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        // Close the drawer on navigation, or a tap on a mobile nav item leaves it covering the page
        // it just opened.
        this.sidebarOpen = false;
        this.syncPageHeader();
      }
    });

    this.syncPageHeader();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  /**
   * Collapse or expand the desktop rail.
   *
   * <p>Separate from {@link toggleSidebar}, which opens the mobile drawer. They look like the same
   * gesture and are not: one is a temporary overlay on a small screen, the other a persistent
   * preference on a large one, and sharing state between them would mean opening the phone drawer
   * silently narrowed the desktop sidebar for the next session.
   */
  toggleSidebarCollapsed(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem(ShellComponent.COLLAPSED_KEY, String(this.sidebarCollapsed));
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeSidebar();
  }

  /**
   * Topbar crumb + title (BridgeCare shell). The title prefers the route's own
   * `titleKey` data (health-connect pages), then the matching sidebar item's
   * label, then the route `title` used for document.title, then the app title.
   */
  private syncPageHeader(): void {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    const routeTitle = typeof route.routeConfig?.title === 'string' ? route.routeConfig.title : null;
    const navItem = findShellNavItem(this.router.url, this.authenticated);
    this.crumbKey = navItem?.crumbKey ?? null;
    this.titleKey = (route.data['titleKey'] as string | undefined) ?? navItem?.labelKey ?? routeTitle ?? 'global.title';
  }
}
