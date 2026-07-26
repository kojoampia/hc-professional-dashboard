import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { AlertService } from 'app/core/util/alert.service';
import { MessagesApiService } from '../api/messages-api.service';

@Component({
  standalone: true,
  selector: 'hpd-messages-page',
  imports: [MatIconModule, TranslateModule],
  template: `
    <main class="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 class="sr-only">{{ 'healthConnect.messages.title' | translate }}</h1>
      <div class="rounded-hpd border border-hpd-border bg-white px-5 py-10 text-center shadow-hpd-sm">
        <mat-icon aria-hidden="true" class="mb-2 !h-9 !w-9 !text-4xl text-hpd-subtle">chat</mat-icon>
        <p class="m-0 text-hpd-muted" data-cy="messagesEmpty">{{ 'healthConnect.messages.empty' | translate }}</p>
        <p class="mb-0 mt-1 text-xs text-hpd-subtle">{{ 'healthConnect.messages.backendPending' | translate }}</p>
        <button
          class="hpd-focusable hpd-btn hpd-btn-ghost mt-4 !py-2 text-sm"
          type="button"
          data-cy="markAllRead"
          [disabled]="messagesApi.unreadCount() === 0"
          (click)="markAllRead()"
        >
          {{ 'healthConnect.actions.markAllRead' | translate }}
        </button>
      </div>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class MessagesPageComponent {
  readonly messagesApi = inject(MessagesApiService);
  private readonly alertService = inject(AlertService);

  markAllRead(): void {
    this.messagesApi.markAllRead();
    this.alertService.showToast('healthConnect.toast.markedRead');
  }
}
