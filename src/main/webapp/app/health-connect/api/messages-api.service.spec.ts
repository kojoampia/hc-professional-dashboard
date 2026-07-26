import { TestBed } from '@angular/core/testing';

import { MessagesApiService } from './messages-api.service';

describe('MessagesApiService', () => {
  let service: MessagesApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessagesApiService);
  });

  it('starts with an empty inbox and no unread messages (no backend endpoint yet)', () => {
    expect(service.messages()).toEqual([]);
    expect(service.unreadCount()).toBe(0);
  });

  it('markAllRead leaves the unread count at zero', () => {
    service.markAllRead();
    expect(service.unreadCount()).toBe(0);
  });
});
