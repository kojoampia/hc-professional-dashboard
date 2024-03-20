import dayjs from 'dayjs/esm';
import { ChatUserStatus } from '../enumeration/chat-user-status.model';

export interface IChatUser {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  langKey?: string;
  createdDate?: dayjs.Dayjs;
  status?: ChatUserStatus;
}

export class ChatUser implements IChatUser {
  constructor(
    public id?: string,
    public firstName?: string,
    public lastName?: string,
    public email?: string,
    public langKey?: string,
    public createdDate?: dayjs.Dayjs,
    public status?: ChatUserStatus,
  ) {}
}
