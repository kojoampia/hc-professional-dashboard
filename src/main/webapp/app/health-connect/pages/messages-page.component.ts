import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { AlertService } from 'app/core/util/alert.service';
import { ConversationDto, MessagesApiService } from '../api/messages-api.service';

@Component({
  standalone: true,
  selector: 'hpd-messages-page',
  imports: [DatePipe, FormsModule, MatIconModule, TranslateModule],
  template: `
    <main class="w-full px-4 py-8 md:px-8">
      <div class="mb-4 flex items-center justify-between gap-3">
        <h1 class="m-0 text-xl font-semibold text-hpd-primary">{{ 'healthConnect.messages.title' | translate }}</h1>
        <div class="flex items-center gap-2">
          <button
            class="hpd-focusable hpd-btn hpd-btn-ghost !py-2 text-sm"
            type="button"
            data-cy="markAllRead"
            [disabled]="messagesApi.unreadCount() === 0"
            (click)="markAllRead()"
          >
            {{ 'healthConnect.actions.markAllRead' | translate }}
          </button>
          <button
            class="hpd-focusable hpd-btn hpd-btn-gold !py-2 text-sm"
            type="button"
            data-cy="composeToggle"
            (click)="composing.set(!composing())"
          >
            <mat-icon aria-hidden="true" class="!h-5 !w-5 !text-xl">edit</mat-icon>
            {{ 'healthConnect.messages.compose' | translate }}
          </button>
        </div>
      </div>

      @if (composing()) {
        <form class="mb-6 rounded-hpd border border-hpd-border bg-white p-5 shadow-hpd-sm" data-cy="composeForm" (ngSubmit)="send()">
          <label class="hpd-label" for="subject">{{ 'healthConnect.messages.subject' | translate }}</label>
          <input id="subject" class="hpd-input mb-3" type="text" name="subject" [(ngModel)]="subject" />

          <label class="hpd-label" for="recipients">{{ 'healthConnect.messages.recipients' | translate }}</label>
          <input id="recipients" class="hpd-input" type="text" name="recipients" data-cy="recipients" [(ngModel)]="recipients" />
          <p class="mb-3 mt-1 text-xs text-hpd-subtle">{{ 'healthConnect.messages.recipientsHint' | translate }}</p>

          <label class="hpd-label" for="role">{{ 'healthConnect.messages.broadcast' | translate }}</label>
          <input id="role" class="hpd-input mb-3" type="text" name="role" placeholder="ROLE_NURSE" [(ngModel)]="role" />

          <label class="hpd-label" for="body">{{ 'healthConnect.messages.body' | translate }}</label>
          <textarea id="body" class="hpd-input mb-4" rows="4" name="body" data-cy="body" [(ngModel)]="body"></textarea>

          <div class="flex gap-2">
            <button class="hpd-focusable hpd-btn hpd-btn-primary !py-2 text-sm" type="submit" data-cy="sendMessage" [disabled]="sending()">
              {{ (sending() ? 'healthConnect.messages.sending' : 'healthConnect.messages.send') | translate }}
            </button>
            <button class="hpd-focusable hpd-btn hpd-btn-ghost !py-2 text-sm" type="button" (click)="composing.set(false)">
              {{ 'healthConnect.actions.cancel' | translate }}
            </button>
          </div>
        </form>
      }

      <div class="grid gap-4 md:grid-cols-[18rem_1fr]">
        <section class="rounded-hpd border border-hpd-border bg-white shadow-hpd-sm" aria-labelledby="threadsHeading">
          <h2 id="threadsHeading" class="m-0 border-b border-hpd-border px-4 py-3 text-sm font-semibold text-hpd-muted">
            {{ 'healthConnect.messages.threads' | translate }}
          </h2>
          @if (messagesApi.conversations().length === 0) {
            <p class="m-0 px-4 py-6 text-center text-sm text-hpd-muted" data-cy="messagesEmpty">
              {{ 'healthConnect.messages.empty' | translate }}
            </p>
          } @else {
            <ul class="m-0 list-none p-0">
              @for (conversation of messagesApi.conversations(); track conversation.id) {
                <li>
                  <button
                    class="hpd-focusable w-full border-0 border-b border-hpd-border bg-transparent px-4 py-3 text-left hover:bg-hpd-cream"
                    type="button"
                    data-cy="threadItem"
                    (click)="open(conversation)"
                  >
                    <span class="block truncate text-sm font-medium text-hpd-primary">{{ conversation.subject }}</span>
                    <span class="block text-xs text-hpd-subtle">{{ conversation.lastMessageAt | date: 'short' }}</span>
                  </button>
                </li>
              }
            </ul>
          }
        </section>

        <section class="rounded-hpd border border-hpd-border bg-white p-5 shadow-hpd-sm" aria-live="polite">
          @if (!selected()) {
            <p class="m-0 py-8 text-center text-sm text-hpd-muted">{{ 'healthConnect.messages.emptyThread' | translate }}</p>
          } @else {
            <h2 class="mb-4 mt-0 text-base font-semibold text-hpd-primary">{{ selected()!.subject }}</h2>
            <ul class="m-0 list-none p-0">
              @for (message of messagesApi.messages(); track message.id) {
                <li class="mb-4 border-b border-hpd-border pb-3 last:border-0" data-cy="messageItem">
                  <div class="flex items-baseline justify-between gap-2">
                    <span class="text-sm font-medium text-hpd-primary">{{ message.senderName }}</span>
                    <span class="text-xs text-hpd-subtle">{{ message.sentAt | date: 'short' }}</span>
                  </div>
                  <p class="m-0 mt-1 whitespace-pre-line text-sm text-hpd-muted">{{ message.body }}</p>
                </li>
              }
            </ul>

            <form class="mt-4 flex gap-2" (ngSubmit)="sendReply()">
              <input class="hpd-input flex-1" type="text" name="reply" data-cy="replyBody" [(ngModel)]="replyBody" />
              <button class="hpd-focusable hpd-btn hpd-btn-primary !py-2 text-sm" type="submit" data-cy="sendReply" [disabled]="sending()">
                {{ 'healthConnect.messages.send' | translate }}
              </button>
            </form>
          }
        </section>
      </div>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class MessagesPageComponent {
  readonly messagesApi = inject(MessagesApiService);
  private readonly alertService = inject(AlertService);

  readonly composing = signal(false);
  readonly sending = signal(false);
  readonly selected = signal<ConversationDto | null>(null);

  subject = '';
  recipients = '';
  role = '';
  body = '';
  replyBody = '';

  constructor() {
    this.messagesApi.refresh();
  }

  open(conversation: ConversationDto): void {
    this.selected.set(conversation);
    this.messagesApi.messagesIn(conversation.id).subscribe();
  }

  markAllRead(): void {
    this.messagesApi.markAllRead();
    this.alertService.showToast('healthConnect.toast.markedRead');
  }

  send(): void {
    // Recipients are free text because there is still no professional-directory endpoint to pick
    // from — see professional-web.md §5. Blank entries are dropped, so a trailing comma is not an
    // error the clinician has to notice.
    const recipientIds = this.recipients
      .split(',')
      .map(value => value.trim())
      .filter(value => value.length > 0);
    if (recipientIds.length === 0 && this.role.trim().length === 0) {
      this.alertService.showToast('healthConnect.messages.noRecipients');
      return;
    }
    this.sending.set(true);
    this.messagesApi.start({ subject: this.subject, body: this.body, recipientIds, recipientRole: this.role.trim() || null }).subscribe({
      next: () => {
        this.sending.set(false);
        this.composing.set(false);
        this.subject = this.recipients = this.role = this.body = '';
        this.alertService.showToast('healthConnect.toast.messageSent');
      },
      error: () => {
        this.sending.set(false);
        this.alertService.showToast('healthConnect.messages.sendFailed');
      },
    });
  }

  sendReply(): void {
    const conversation = this.selected();
    if (!conversation || this.replyBody.trim().length === 0) {
      return;
    }
    this.sending.set(true);
    this.messagesApi.reply(conversation.id, this.replyBody).subscribe({
      next: () => {
        this.sending.set(false);
        this.replyBody = '';
        this.messagesApi.messagesIn(conversation.id).subscribe();
      },
      error: () => {
        this.sending.set(false);
        this.alertService.showToast('healthConnect.messages.sendFailed');
      },
    });
  }
}
