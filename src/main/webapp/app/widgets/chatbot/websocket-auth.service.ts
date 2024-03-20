import { Injectable } from '@angular/core';
import { Subscription, ReplaySubject, Subject } from 'rxjs';
import SockJS from 'sockjs-client';
import * as Stomp from 'webstomp-client';

import { AuthServerProvider } from 'app/core/auth/auth-jwt.service';
import { Location } from '@angular/common';
import { EventManager } from 'app/core/util/event-manager.service';

@Injectable({ providedIn: 'root' })
export class WebsocketAuthService {
  private $stompClient: Stomp.Client | null = null;
  private routerSubscription: Subscription | null = null;
  private connectionSubject: ReplaySubject<void> = new ReplaySubject(1);
  MAX_RETRIES = 5;
  CURRENT_TRY = 0;

  authToken: string;

  constructor(
    private authServerProvider: AuthServerProvider,
    private eventManager: EventManager,
    private location: Location,
  ) {
    this.authToken = this.authServerProvider.getToken();
  }

  // Get the connection
  public getConnection(): ReplaySubject<void> {
    return this.connectionSubject;
  }

  public stompClient(): Stomp.Client {
    return this.$stompClient!;
  }

  isConnected(): boolean {
    return this.$stompClient !== null && this.$stompClient.connected;
  }

  connect(): void {
    if (this.$stompClient && this.$stompClient.connected) {
      this.eventManager.broadcast('chat-websocket-connected');
      return;
    }
    this.authToken = this.authServerProvider.getToken();
    if (this.authToken) {
      this.websocketConnection(this.authToken);
    }
  }

  websocketConnection(authToken: string): void {
    let url = '/websocket?access_token=' + authToken;
    url = this.location.prepareExternalUrl(url);

    const socket: WebSocket = new SockJS(url);
    this.$stompClient = Stomp.over(socket);

    const headers: Stomp.ConnectionHeaders = { Authorization: 'Bearer ' + authToken };
    this.$stompClient.connect(
      headers,
      () => {
        this.connectionSubject.next();
        this.eventManager.broadcast('chat-websocket-connected');
      },
      () => {
        if (this.CURRENT_TRY < this.MAX_RETRIES) {
          this.CURRENT_TRY++;
          setTimeout(() => {
            this.websocketConnection(authToken);
          }, 1000);
        }
      },
    );
  }

  disconnect(): void {
    this.connectionSubject = new ReplaySubject(1);

    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
      this.routerSubscription = null;
    }

    if (this.$stompClient) {
      if (this.$stompClient.connected) {
        this.$stompClient.disconnect();
      }
      this.$stompClient = null;
    }
  }

  subscribe(destination: string): Subject<any> {
    const listenerSubject: Subject<any> = new Subject<any>();
    this.connectionSubject.subscribe(() => {
      if (this.$stompClient) {
        this.$stompClient.subscribe(destination, (data: Stomp.Message) => {
          listenerSubject.next(JSON.parse(data.body));
          return listenerSubject;
        });
      }
    });
    return listenerSubject;
  }
}
