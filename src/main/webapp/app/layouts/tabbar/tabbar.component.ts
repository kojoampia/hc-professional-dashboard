import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import SharedModule from 'app/shared/shared.module';
import { MessagesApiService } from 'app/health-connect/api/messages-api.service';
import { Account } from 'app/core/auth/account.model';
import { AccountService } from 'app/core/auth/account.service';
import { shellTabbarItems } from '../sidebar/shell-navigation';

/**
 * Mobile bottom tab bar (BridgeCare shell) — visible below `lg` for
 * authenticated users; desktop navigation lives in the sidebar.
 */
@Component({
  selector: 'hpd-tabbar',
  host: { class: 'contents' },
  imports: [RouterModule, SharedModule, MatIconModule],
  template: `
    @if (account !== null) {
      <nav
        data-cy="tabbar"
        class="fixed inset-x-0 bottom-0 z-30 flex border-t border-hpd-border bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
        [attr.aria-label]="'healthConnect.navigation.menu' | translate"
      >
        @for (item of items; track item.path) {
          <a
            class="hpd-focusable flex flex-1 flex-col items-center gap-0.5 px-1 pb-2.5 pt-2 text-[10.5px] font-bold no-underline text-hpd-muted [&.active]:text-hpd-primary"
            [routerLink]="item.path"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
          >
            <span class="relative">
              <mat-icon aria-hidden="true" class="!h-5 !w-5 !text-[20px]">{{ item.icon }}</mat-icon>
              @if (badgeCount(item); as count) {
                <span
                  class="absolute -right-2 -top-1 rounded-full bg-hpd-gold px-1 text-[9.5px] font-extrabold leading-[14px] text-[#3a2a08]"
                  >{{ count }}</span
                >
              }
            </span>
            <span class="truncate" [jhiTranslate]="item.labelKey"></span>
          </a>
        }
      </nav>
    }
  `,
})
export default class TabbarComponent implements OnInit {
  readonly messagesApi = inject(MessagesApiService);
  items = shellTabbarItems();
  account: Account | null = null;

  badgeCount(item: (typeof this.items)[number]): number {
    return item.badge === 'unreadMessages' ? this.messagesApi.unreadCount() : 0;
  }

  constructor(private accountService: AccountService) {}

  ngOnInit(): void {
    this.accountService.getAuthenticationState().subscribe(account => {
      this.account = account;
    });
  }
}
