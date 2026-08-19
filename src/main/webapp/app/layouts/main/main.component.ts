import { Component, OnInit, RendererFactory2, Renderer2 } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TranslateService, LangChangeEvent } from '@ngx-translate/core';
import dayjs from 'dayjs/esm';

import { AccountService } from 'app/core/auth/account.service';
import { AppPageTitleStrategy } from 'app/app-page-title-strategy';
import SharedModule from 'app/shared/shared.module';
import PageRibbonComponent from '../profiles/page-ribbon.component';
import ToastOutletComponent from 'app/shared/alert/toast-outlet.component';

/**
 * A mount point, not a layout.
 *
 * <p>This used to hold the sidebar, topbar, footer and tab bar, which meant every screen got them —
 * including sign-in, where a visitor read a sidebar full of destinations that all bounced them
 * back. The chrome moved to {@code ShellComponent} and the routes now choose: the signed-out
 * screens render on {@code AuthShellComponent}, the portal on {@code ShellComponent}.
 *
 * <p>What remains here is what belongs to every screen regardless of which shell is showing:
 *
 * <ul>
 *   <li>the environment ribbon;
 *   <li>the toast outlet — a toast raised by a failed sign-in has to render on the sign-in page,
 *       which is inside neither shell;
 *   <li>automatic sign-in, so a returning session resolves before the guards run;
 *   <li>the language change, which updates dayjs's locale and the {@code <html lang>} attribute —
 *       both document-level and both wanted on the signed-out screens too, since those ship in four
 *       languages as well.
 * </ul>
 */
@Component({
  selector: 'hpd-main',
  templateUrl: './main.component.html',
  providers: [AppPageTitleStrategy],
  imports: [RouterModule, SharedModule, PageRibbonComponent, ToastOutletComponent],
})
export default class MainComponent implements OnInit {
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

    this.translateService.onLangChange.subscribe((langChangeEvent: LangChangeEvent) => {
      this.appPageTitleStrategy.updateTitle(this.router.routerState.snapshot);
      dayjs.locale(langChangeEvent.lang);
      this.renderer.setAttribute(document.querySelector('html'), 'lang', langChangeEvent.lang);
    });
  }
}
