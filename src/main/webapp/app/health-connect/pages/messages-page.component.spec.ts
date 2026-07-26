import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { AlertService } from 'app/core/util/alert.service';
import { MessagesApiService } from '../api/messages-api.service';
import MessagesPageComponent from './messages-page.component';

describe('MessagesPageComponent', () => {
  let fixture: ComponentFixture<MessagesPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessagesPageComponent, TranslateModule.forRoot()],
    }).compileComponents();
    fixture = TestBed.createComponent(MessagesPageComponent);
    fixture.detectChanges();
  });

  it('renders the empty state and disables mark-all-read when nothing is unread', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[data-cy="messagesEmpty"]')).toBeTruthy();
    expect(element.querySelector<HTMLButtonElement>('[data-cy="markAllRead"]')!.disabled).toBe(true);
  });

  it('marks all messages read and confirms with a toast', () => {
    const messagesApi = TestBed.inject(MessagesApiService);
    const alertService = TestBed.inject(AlertService);
    const toastSpy = jest.spyOn(alertService, 'showToast');
    jest.spyOn(messagesApi, 'markAllRead');

    fixture.componentInstance.markAllRead();

    expect(messagesApi.markAllRead).toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalledWith('healthConnect.toast.markedRead');
  });
});
