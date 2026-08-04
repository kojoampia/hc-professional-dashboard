import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { MessageNotification, MessageSocketService } from './message-socket.service';
import { MessagesApiService } from './messages-api.service';

/**
 * The socket is stubbed rather than opened: these tests are about what the service does with a
 * notification, and a real STOMP client would need a server to connect to.
 */
class SocketStub {
  readonly notifications = new Subject<MessageNotification>();
  connect = jest.fn();
  disconnect = jest.fn();
}

describe('MessagesApiService', () => {
  let service: MessagesApiService;
  let httpMock: HttpTestingController;
  let socket: SocketStub;

  beforeEach(() => {
    socket = new SocketStub();
    TestBed.configureTestingModule({
      // TranslateModule because the service injects AccountService, which depends on it.
      imports: [TranslateModule.forRoot()],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: MessageSocketService, useValue: socket }],
    });
    service = TestBed.inject(MessagesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify({ ignoreCancelled: true }));

  it('starts empty until something is loaded', () => {
    expect(service.messages()).toEqual([]);
    expect(service.conversations()).toEqual([]);
    expect(service.unreadCount()).toBe(0);
  });

  it('addresses the microservice route rather than the gateway root', () => {
    service.loadConversations();
    const request = httpMock.expectOne(req => req.method === 'GET' && req.url.includes('/conversations'));
    // A bare /api/messaging would hit the gateway, which has no such endpoint.
    expect(request.request.url).toContain('services/professionalservice/api/messaging/conversations');
    request.flush([]);
  });

  it('takes the unread count from the server rather than deriving it from what is loaded', () => {
    service.loadUnreadCount();
    httpMock.expectOne(req => req.url.endsWith('/unread-count')).flush(7);

    // Nothing is in messages(), so a derived count would say 0 and under-report the badge.
    expect(service.messages()).toEqual([]);
    expect(service.unreadCount()).toBe(7);
  });

  it('fetches the real message when a notification arrives, and folds it in', () => {
    socket.notifications.next({ messageId: 'm1', conversationId: 'c1' });

    const fetch = httpMock.expectOne(req => req.url.endsWith('/api/messaging/messages/m1'));
    expect(fetch.request.method).toBe('GET');
    fetch.flush({ id: 'm1', body: 'Bed 4 needs review', senderName: 'nurse-a' });

    expect(service.messages().map(message => message.id)).toEqual(['m1']);

    // The badge and the thread order are both refreshed off the back of it.
    httpMock.expectOne(req => req.url.endsWith('/unread-count')).flush(1);
    httpMock.expectOne(req => req.url.endsWith('/conversations')).flush([]);
    expect(service.unreadCount()).toBe(1);
  });

  it('does not duplicate a message it already holds when an event is redelivered', () => {
    socket.notifications.next({ messageId: 'm1' });
    httpMock.expectOne(req => req.url.endsWith('/messages/m1')).flush({ id: 'm1', body: 'first' });
    httpMock.expectOne(req => req.url.endsWith('/unread-count')).flush(1);
    httpMock.expectOne(req => req.url.endsWith('/conversations')).flush([]);

    socket.notifications.next({ messageId: 'm1' });
    httpMock.expectOne(req => req.url.endsWith('/messages/m1')).flush({ id: 'm1', body: 'first' });
    httpMock.expectOne(req => req.url.endsWith('/unread-count')).flush(1);
    httpMock.expectOne(req => req.url.endsWith('/conversations')).flush([]);

    expect(service.messages()).toHaveLength(1);
  });

  it('survives a notification naming a message this account may not read', () => {
    socket.notifications.next({ messageId: 'not-mine' });
    httpMock.expectOne(req => req.url.endsWith('/messages/not-mine')).flush('', { status: 404, statusText: 'Not Found' });

    // A 404 is legitimate here, so it must not throw — and the badge is reloaded so it cannot drift.
    httpMock.expectOne(req => req.url.endsWith('/unread-count')).flush(0);
    expect(service.messages()).toEqual([]);
  });
});
