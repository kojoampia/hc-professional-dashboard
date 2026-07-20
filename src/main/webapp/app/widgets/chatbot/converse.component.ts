import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewChecked, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ConversationService } from './converse.service';
import { Subscription } from 'rxjs';
import { SessionStorage, LocalStorageService } from 'ngx-webstorage';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import dayjs from 'dayjs/esm';
import { ChatMessage, IChatMessage } from './model/chat-message.model';
import { IChatUser, ChatUser } from './model/chat-user.model';
import { DATE_TIME_FORMAT } from 'app/config/input.constants';
import { TranslateService } from '@ngx-translate/core';
import SharedModule from 'app/shared/shared.module';
import { FormatMediumDatetimePipe, FormatMediumDatePipe } from 'app/shared/date';

@Component({
  selector: 'jhi-converse',
  templateUrl: './converse.component.html',
  styleUrls: ['./converse.component.scss'],
  imports: [SharedModule, FormsModule, ReactiveFormsModule, FormatMediumDatetimePipe, FormatMediumDatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ConverseComponent implements OnInit, OnDestroy, AfterViewChecked {
  public isToggleChat = false;
  public notification = '';
  public message = '';
  @SessionStorage() public messages: IChatMessage[];
  @SessionStorage() public client?: IChatUser;
  privateSubscription?: Subscription;
  public success = false;
  @ViewChild('chatScreen') private chatScreen: ElementRef = {} as ElementRef;
  public autoScrollError = '';
  registrationInvalid = false;

  registerForm = this.fb.group({
    firstName: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
        Validators.pattern('^[a-zA-Z0-9!$&*+=?^_`{|}~.-]+@[a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)*$|^[_.@A-Za-z0-9- ]+$'),
      ],
    ],
    lastName: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
        Validators.pattern('^[a-zA-Z0-9!$&*+=?^_`{|}~.]+@[a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)*$|^[_.@A-Za-z0-9- ]+$'),
      ],
    ],
    email: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(254), Validators.email]],
  });

  constructor(
    private chatService: ConversationService,
    private fb: FormBuilder,
    private languageService: TranslateService,
    private localStorageService: LocalStorageService,
  ) {
    this.messages = this.localStorageService.retrieve('messages');
    if (!this.messages) {
      this.messages = [];
    }
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnInit(): void {
    this.initialize();
    this.autoSubscribe();
    this.scrollToBottom();
  }

  autoSubscribe(): void {
    if (!this.chatService.hasSubscribed()) {
      if (this.client) {
        // Join chat sends a customer_join telegram and subscribes to topic/client.email
        this.chatService.joinChat(this.client);
      }
    }
    setTimeout(() => {
      this.autoSubscribe();
    }, 5000);
  }

  initialize(): void {
    if (this.client) {
      this.success = true;
      this.handlePrivateMessages();
      this.initMessage();
    }
  }

  initMessage(): void {
    this.clear();
    const name = this.client?.firstName || 'a';
    const fName = name.charAt(0).toUpperCase() + name.slice(1);
    const welcomeMessage = 'Hello ' + fName + ', how may I help you?';
    const serviceName = 'Customer Service';
    setTimeout(() => {
      this.messages.push({
        ...new ChatMessage(),
        name: serviceName,
        sender: 'customer-service@bedrockinsurancegh.com',
        language: this.client?.langKey as string,
        recipient: this.client?.email,
        content: welcomeMessage,
        createdDate: dayjs(new Date(), DATE_TIME_FORMAT),
      });
    }, 2000);
  }

  handlePrivateMessages(): void {
    this.privateSubscription = this.chatService.receivePrivateMessages().subscribe(message => {
      this.addMessage(message);
    });
  }

  addMessage(message: IChatMessage): void {
    this.messages.push(message);
  }

  toggleChat(): void {
    this.isToggleChat = !this.isToggleChat;
  }

  clear(): void {
    this.message = '';
    this.messages = [];
  }

  reconnect(): void {
    this.initialize();
  }

  send(): void {
    if (this.client && this.message) {
      const clientName = this.client.firstName + ' ' + this.client.lastName;
      const messageToken = {
        ...new ChatMessage(),
        name: clientName,
        sender: this.client.email,
        language: this.languageService.currentLang as string,
        content: this.message,
        recipient: 'customer-service@bedrockinsurancegh.com',
        createdDate: dayjs(new Date(), DATE_TIME_FORMAT),
      };
      this.messages.push(messageToken);
      this.chatService.sendMessage(messageToken);
      this.message = '';
    }
  }

  register(): void {
    this.registrationInvalid = true;
    if (this.registerForm.valid) {
      this.registrationInvalid = false;
      this.client = {
        ...new ChatUser(),
        firstName: this.registerForm.get(['firstName'])!.value,
        lastName: this.registerForm.get(['lastName'])!.value,
        email: this.registerForm.get(['email'])!.value,
        langKey: this.languageService.currentLang,
      };
      this.chatService.register(this.client);
      this.initialize();
    }
  }

  typing(): void {
    if (this.client) {
      this.chatService.typingChat(this.client);
    }
  }

  stoppedTyping(): void {
    if (this.client) {
      this.chatService.typingStopped(this.client);
    }
  }

  scrollToBottom(): void {
    try {
      this.chatScreen.nativeElement.scrollTop = this.chatScreen.nativeElement.scrollHeight;
    } catch (err) {
      this.autoScrollError = err as string;
    }
  }

  ngOnDestroy(): void {
    if (this.client) {
      this.chatService.leaveChat(this.client);
    }
  }
}
