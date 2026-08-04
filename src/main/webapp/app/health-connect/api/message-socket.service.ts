import { Injectable, inject } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { Observable, Subject } from 'rxjs';

import { AuthServerProvider } from 'app/core/auth/auth-jwt.service';

/**
 * What a `message.created` frame carries: identifiers, never content.
 */
export interface MessageNotification {
  messageId: string;
  conversationId?: string;
  occurredAt?: string;
}

/**
 * STOMP connection for message notifications.
 *
 * **The path is `/websocket/messages`, not `/services/professionalservice/...`.** Both nginx layers
 * forward `Upgrade`/`Connection` only on their dedicated `/websocket` location; the `/services`
 * location does not. Routed the other way the socket is silently downgraded to plain HTTP and
 * rejected, which presents as an inbox that renders but never updates. The gateway has a matching
 * route straight to professionalservice.
 *
 * **The token goes on the CONNECT frame, not the handshake**, because a browser cannot set an
 * Authorization header on a WebSocket upgrade. The server permits the handshake and authenticates
 * the CONNECT, dropping it when the token is missing or invalid.
 *
 * SockJS is deliberately not used: the server registers the endpoint without it, and the proxy path
 * supports a native upgrade end to end, so the fallback transports would only add a polling path
 * nothing needs.
 */
@Injectable({ providedIn: 'root' })
export class MessageSocketService {
  private readonly authServerProvider = inject(AuthServerProvider);

  private client?: Client;
  private readonly subject = new Subject<MessageNotification>();

  /** Notifications as they arrive. Identifiers only — the caller fetches the message itself. */
  readonly notifications: Observable<MessageNotification> = this.subject.asObservable();

  connect(): void {
    if (this.client?.active) {
      return;
    }
    const token = this.authServerProvider.getToken();
    if (!token) {
      return;
    }

    this.client = new Client({
      brokerURL: this.brokerUrl(),
      // Read once per connection attempt rather than captured, so a reconnect after a token
      // refresh presents the current token instead of the one this client started with.
      beforeConnect: () => {
        this.client!.connectHeaders = { Authorization: `Bearer ${this.authServerProvider.getToken()}` };
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 20000,
      heartbeatOutgoing: 20000,
    });

    this.client.onConnect = () => {
      // The user destination resolves server-side against the authenticated principal, so this
      // subscription cannot be pointed at somebody else's queue by editing the path.
      this.client!.subscribe('/user/queue/messages', (frame: IMessage) => {
        try {
          this.subject.next(JSON.parse(frame.body) as MessageNotification);
        } catch {
          // A malformed frame must not tear down the subscription; the next one should still land.
        }
      });
    };

    this.client.activate();
  }

  disconnect(): void {
    // deactivate() also stops the reconnect timer — without it the client would keep dialling after
    // sign-out and reconnect with a token that is no longer valid.
    void this.client?.deactivate();
    this.client = undefined;
  }

  /**
   * Same origin as the page, with the scheme swapped: wss:// in production, ws:// against the dev
   * server. Deriving it rather than configuring it keeps the socket on the origin that served the
   * app, which is what makes it same-origin and cookie/CORS-free.
   */
  private brokerUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/websocket/messages`;
  }
}
