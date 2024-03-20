import { Injectable } from '@angular/core';
import { WebsocketAuthService } from './websocket-auth.service';
import { Subject, Subscription } from 'rxjs';
import * as Stomp from 'webstomp-client';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { IChatMessage } from './model/chat-message.model';
import { IChatUser } from './model/chat-user.model';
import { ChatUserStatus } from './enumeration/chat-user-status.model';
import dayjs from 'dayjs/esm';

type EntityResponseType = HttpResponse<IChatUser>;
type EntityArrayResponseType = HttpResponse<IChatUser[]>;

@Injectable({ providedIn: 'root' })
export class ConversationService {
  public resourceUrl = SERVER_API_URL + 'api/chat-users';
  // Chat connection
  private privateChannelSubscription: Subscription | null = null;
  private privateChannelListenerSubject: Subject<IChatMessage> = new Subject();

  constructor(
    private websocketService: WebsocketAuthService,
    protected http: HttpClient,
  ) {}

  isConnected(): boolean {
    return this.websocketService.isConnected();
  }

  connect(): void {
    this.websocketService.connect();
  }

  hasSubscribed(): boolean {
    if (this.privateChannelSubscription) {
      return true;
    }
    return false;
  }

  disconnect(): void {
    this.unsubscribe();
    this.websocketService.disconnect();
  }

  subscribeToPrivateChannel(email: string): void {
    if (this.privateChannelSubscription) {
      return;
    }
    const destination = '/topic/' + email;
    this.privateChannelSubscription = this.websocketService.getConnection().subscribe(() => {
      if (this.websocketService.stompClient()) {
        this.websocketService.stompClient().subscribe(destination, (data: Stomp.Message) => {
          this.privateChannelListenerSubject.next(JSON.parse(data.body));
        });
      }
    });
  }

  receivePrivateMessages(): Subject<IChatMessage> {
    return this.privateChannelListenerSubject;
  }

  unsubscribe(): void {
    if (this.privateChannelSubscription) {
      this.privateChannelSubscription.unsubscribe();
      this.privateChannelSubscription = null;
    }
  }

  /** Chat channel setup */
  public sendMessage(message: any): void {
    if (this.websocketService.isConnected()) {
      this.websocketService.stompClient().send(
        '/web/customer_message',
        JSON.stringify(message),
        {}, // header
      );
    }
  }

  /** Registration channel setup */
  public register(chatUser: IChatUser): void {
    if (this.websocketService.isConnected()) {
      this.websocketService.stompClient().send('/web/register', JSON.stringify(chatUser));
      this.joinChat(chatUser);
    }
  }

  public registerChatUser(chatUser: IChatUser): void {
    const copy = this.convertDateFromClient(chatUser);
    this.http
      .post<IChatUser>(this.resourceUrl, copy, { observe: 'response' })
      .pipe(map((res: EntityResponseType) => this.convertDateFromServer(res)))
      .subscribe(res => {
        this.joinChat(res.body as IChatUser);
      });
  }

  public joinChat(chatUser: IChatUser): void {
    chatUser.status = ChatUserStatus.ONLINE;
    if (this.websocketService.isConnected()) {
      this.websocketService.stompClient().send('/web/customer_join', JSON.stringify(chatUser));
      this.subscribeToPrivateChannel(chatUser.email as string);
    }
  }

  public leaveChat(chatUser: IChatUser): void {
    chatUser.status = ChatUserStatus.OFFLINE;
    if (this.websocketService.isConnected()) {
      this.websocketService.stompClient().send('/web/customer_leave', JSON.stringify(chatUser));
    }
  }

  public typingChat(chatUser: IChatUser): void {
    chatUser.status = ChatUserStatus.TYPING;
    if (this.websocketService.isConnected()) {
      this.websocketService.stompClient().send('/web/customer_typing', JSON.stringify(chatUser));
    }
  }

  public typingStopped(chatUser: IChatUser): void {
    chatUser.status = ChatUserStatus.ONLINE;
    if (this.websocketService.isConnected()) {
      this.websocketService.stompClient().send('/web/customer_stopped_typing', JSON.stringify(chatUser));
    }
  }

  protected convertDateFromClient(chatUser: IChatUser): IChatUser {
    const copy: IChatUser = Object.assign({}, chatUser, {
      createdDate: chatUser.createdDate && chatUser.createdDate.isValid() ? chatUser.createdDate.toJSON() : undefined,
    });
    return copy;
  }

  protected convertDateFromServer(res: EntityResponseType): EntityResponseType {
    if (res.body) {
      res.body.createdDate = res.body.createdDate ? dayjs(res.body.createdDate) : undefined;
    }
    return res;
  }

  protected convertDateArrayFromServer(res: EntityArrayResponseType): EntityArrayResponseType {
    if (res.body) {
      res.body.forEach((chatUser: IChatUser) => {
        chatUser.createdDate = chatUser.createdDate ? dayjs(chatUser.createdDate) : undefined;
      });
    }
    return res;
  }
}
