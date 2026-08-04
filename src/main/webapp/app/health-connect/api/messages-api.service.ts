import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, tap } from 'rxjs';

import { AccountService } from 'app/core/auth/account.service';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { MessageSocketService } from './message-socket.service';

/** A thread. Membership is server-side; the client never sends an account id. */
export interface ConversationDto {
  id: string;
  subject?: string;
  createdBy?: string;
  createdAt?: string;
  lastMessageAt?: string;
}

export interface MessageDto {
  id: string;
  conversationId?: string;
  senderId?: string;
  senderName?: string;
  body?: string;
  sentAt?: string;
  recipientRole?: string | null;
}

export interface NewConversation {
  subject?: string;
  body: string;
  recipientIds?: string[];
  recipientRole?: string | null;
}

/**
 * Messages surface, backed by professionalservice `/api/messaging/**`.
 *
 * The public API stayed signal-based, so the page did not have to change shape when this stopped
 * being an in-memory stub.
 *
 * **How a message arrives instantly.** The api publishes `message.created` to Kafka carrying
 * identifiers only; a STOMP frame relays those identifiers here, and this service then fetches the
 * message over HTTP. That second hop is not redundant — the socket deliberately never carries
 * message content, so the read goes through the same authorization check as any other, and a frame
 * naming something the caller may not read simply yields nothing.
 */
@Injectable({ providedIn: 'root' })
export class MessagesApiService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);
  private readonly accountService = inject(AccountService);
  private readonly socket = inject(MessageSocketService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/messaging', 'professionalservice');

  private readonly messagesState = signal<readonly MessageDto[]>([]);
  private readonly conversationsState = signal<readonly ConversationDto[]>([]);
  private readonly unreadState = signal(0);

  readonly messages = computed(() => this.messagesState());
  readonly conversations = computed(() => this.conversationsState());

  /**
   * Taken from the server's count rather than derived from `messages()`: what is loaded is only the
   * most recent slice, so deriving it would under-report as soon as there is more than one page.
   */
  readonly unreadCount = computed(() => this.unreadState());

  constructor() {
    // Connect when signed in and drop the socket on sign-out: a live session must not outlive the
    // token that authorised it.
    this.accountService
      .getAuthenticationState()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(account => {
        if (account) {
          this.socket.connect();
          this.refresh();
        } else {
          this.socket.disconnect();
          this.messagesState.set([]);
          this.conversationsState.set([]);
          this.unreadState.set(0);
        }
      });

    this.socket.notifications.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(notification => {
      this.http.get<MessageDto>(`${this.resourceUrl}/messages/${notification.messageId}`).subscribe({
        next: message => this.mergeIncoming(message),
        // A 404 is legitimate rather than exceptional here: the frame may name a message this
        // account cannot read. Reload the count so the badge cannot drift, and otherwise ignore it.
        error: () => this.loadUnreadCount(),
      });
    });
  }

  /** Reloads everything the inbox shows. Safe to call repeatedly. */
  refresh(): void {
    this.loadConversations();
    this.loadUnreadCount();
  }

  loadConversations(): void {
    this.http.get<ConversationDto[]>(`${this.resourceUrl}/conversations`).subscribe(conversations => {
      this.conversationsState.set(conversations);
    });
  }

  loadUnreadCount(): void {
    this.http.get<number>(`${this.resourceUrl}/unread-count`).subscribe(count => this.unreadState.set(count));
  }

  messagesIn(conversationId: string): Observable<MessageDto[]> {
    return this.http
      .get<MessageDto[]>(`${this.resourceUrl}/conversations/${conversationId}/messages`)
      .pipe(tap(messages => this.messagesState.set(messages)));
  }

  start(request: NewConversation): Observable<MessageDto> {
    return this.http.post<MessageDto>(`${this.resourceUrl}/conversations`, request).pipe(tap(() => this.refresh()));
  }

  reply(conversationId: string, body: string): Observable<MessageDto> {
    return this.http
      .post<MessageDto>(`${this.resourceUrl}/conversations/${conversationId}/messages`, { body })
      .pipe(tap(() => this.refresh()));
  }

  markRead(messageId: string): void {
    this.http.post<void>(`${this.resourceUrl}/messages/${messageId}/read`, {}).subscribe(() => this.loadUnreadCount());
  }

  markAllRead(): void {
    this.http.post<number>(`${this.resourceUrl}/read-all`, {}).subscribe(() => this.unreadState.set(0));
  }

  private mergeIncoming(message: MessageDto): void {
    this.messagesState.update(messages => (messages.some(m => m.id === message.id) ? messages : [message, ...messages]));
    this.loadUnreadCount();
    // A new message moves its thread to the top, so reload the list rather than patching in place.
    this.loadConversations();
  }
}
