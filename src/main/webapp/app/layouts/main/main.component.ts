import { Component, HostListener, OnInit, RendererFactory2, Renderer2, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { TranslateService, LangChangeEvent } from '@ngx-translate/core';
import dayjs from 'dayjs/esm';

import { AccountService } from 'app/core/auth/account.service';
import { hasHealthConnectPermission } from 'app/health-connect/authority-role';
import { MessagesApiService } from 'app/health-connect/api/messages-api.service';
import { AppPageTitleStrategy } from 'app/app-page-title-strategy';
import SharedModule from 'app/shared/shared.module';
import FooterComponent from '../footer/footer.component';
import PageRibbonComponent from '../profiles/page-ribbon.component';
import ToastOutletComponent from 'app/shared/alert/toast-outlet.component';
import FirstLoginAcknowledgementComponent from 'app/health-connect/first-login/first-login-acknowledgement.component';
import SidebarComponent from '../sidebar/sidebar.component';
import TabbarComponent from '../tabbar/tabbar.component';
import { findShellNavItem } from '../sidebar/shell-navigation';

@Component({
  selector: 'hpd-main',
  templateUrl: './main.component.html',
  providers: [AppPageTitleStrategy],
  imports: [
    RouterModule,
    SharedModule,
    MatIconModule,
    FooterComponent,
    PageRibbonComponent,
    SidebarComponent,
    TabbarComponent,
    ToastOutletComponent,
    FirstLoginAcknowledgementComponent,
  ],
})
export default class MainComponent implements OnInit {
  sidebarOpen = false;
  crumbKey: string | null = null;
  titleKey = 'global.title';
  canCreatePatients = false;
  authenticated = false;

  readonly messagesApi = inject(MessagesApiService);

  private renderer: Renderer2;

  constructor(
    private router: Router,
    private appPageTitleStrategy: AppPageTitleStrategy,
    private accountService: AccountService,
    private translateService: TranslateService,
    rootRenderer: RendererFactory2,
  ) {
    this.renderer = rootRenderer.createRenderer(document.querySelector('html'), null);
  }

  ngOnInit(): void {
    // try to log in automatically
    this.accountService.identity().subscribe();

    this.accountService.getAuthenticationState().subscribe(account => {
      this.authenticated = account !== null;
      this.canCreatePatients = hasHealthConnectPermission(account?.authorities, 'managePatient');
      this.syncPageHeader();
    });

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.sidebarOpen = false;
        this.syncPageHeader();
      }
    });

    this.translateService.onLangChange.subscribe((langChangeEvent: LangChangeEvent) => {
      this.appPageTitleStrategy.updateTitle(this.router.routerState.snapshot);
      dayjs.locale(langChangeEvent.lang);
      this.renderer.setAttribute(document.querySelector('html'), 'lang', langChangeEvent.lang);
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
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
