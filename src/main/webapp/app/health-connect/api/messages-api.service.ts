import { Injectable, computed, signal } from '@angular/core';

export interface ClinicianMessage {
  id: string;
  from: string;
  body: string;
  sentAt: string;
  read: boolean;
}

/**
 * Messages surface (web-layout-plan.md Phase 6c).
 *
 * BACKEND DEPENDENCY: no messages endpoint exists yet in `gateway/` or `api/`
 * — this service intentionally serves an empty inbox rather than faking data.
 * When the backend lands, replace the signals with HTTP calls (keep the
 * signal-based public API) and delete this comment.
 */
@Injectable({ providedIn: 'root' })
export class MessagesApiService {
  private readonly messagesState = signal<readonly ClinicianMessage[]>([]);

  readonly messages = computed(() => this.messagesState());
  readonly unreadCount = computed(() => this.messagesState().filter(message => !message.read).length);

  markAllRead(): void {
    this.messagesState.update(messages => messages.map(message => ({ ...message, read: true })));
  }
}
