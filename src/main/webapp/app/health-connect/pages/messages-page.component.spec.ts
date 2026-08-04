import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { AlertService } from 'app/core/util/alert.service';
import { MessagesApiService } from '../api/messages-api.service';
import MessagesPageComponent from './messages-page.component';

describe('MessagesPageComponent', () => {
  let fixture: ComponentFixture<MessagesPageComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessagesPageComponent, TranslateModule.forRoot()],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(MessagesPageComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  /** The page refreshes on construction; flush those so each test starts from a known state. */
  const flushInitialLoad = (conversations: unknown[] = [], unread = 0) => {
    httpMock.match(request => request.url.endsWith('/api/messaging/conversations')).forEach(req => req.flush(conversations));
    httpMock.match(request => request.url.endsWith('/api/messaging/unread-count')).forEach(req => req.flush(unread));
  };

  afterEach(() => {
    httpMock.verify({ ignoreCancelled: true });
  });

  it('renders the empty state and disables mark-all-read when nothing is unread', () => {
    flushInitialLoad();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[data-cy="messagesEmpty"]')).toBeTruthy();
    expect(element.querySelector<HTMLButtonElement>('[data-cy="markAllRead"]')!.disabled).toBe(true);
  });

  it('marks all messages read and confirms with a toast', () => {
    flushInitialLoad();
    const messagesApi = TestBed.inject(MessagesApiService);
    const alertService = TestBed.inject(AlertService);
    const toastSpy = jest.spyOn(alertService, 'showToast');
    jest.spyOn(messagesApi, 'markAllRead').mockImplementation(() => undefined);

    fixture.componentInstance.markAllRead();

    expect(messagesApi.markAllRead).toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalledWith('healthConnect.toast.markedRead');
  });

  it('lists the conversations it is given', () => {
    flushInitialLoad([{ id: 'c1', subject: 'Handover', lastMessageAt: '2026-08-04T09:00:00Z' }], 1);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('[data-cy="threadItem"]')).toHaveLength(1);
    expect(element.querySelector('[data-cy="threadItem"]')!.textContent).toContain('Handover');
    // A server-supplied unread count enables the action, rather than one derived from what loaded.
    expect(element.querySelector<HTMLButtonElement>('[data-cy="markAllRead"]')!.disabled).toBe(false);
  });

  it('refuses to send without a recipient or a role, without calling the server', () => {
    flushInitialLoad();
    const alertService = TestBed.inject(AlertService);
    const toastSpy = jest.spyOn(alertService, 'showToast');

    fixture.componentInstance.body = 'hello';
    fixture.componentInstance.send();

    expect(toastSpy).toHaveBeenCalledWith('healthConnect.messages.noRecipients');
    httpMock.expectNone(request => request.url.endsWith('/api/messaging/conversations') && request.method === 'POST');
  });

  it('drops blank entries from the comma-separated recipient list', () => {
    flushInitialLoad();
    fixture.componentInstance.recipients = 'nurse-a, , nurse-b,';
    fixture.componentInstance.body = 'Bed 4';

    fixture.componentInstance.send();

    const request = httpMock.expectOne(req => req.url.endsWith('/api/messaging/conversations') && req.method === 'POST');
    expect(request.request.body.recipientIds).toEqual(['nurse-a', 'nurse-b']);
    request.flush({ id: 'm1' });
    flushInitialLoad();
  });
});
