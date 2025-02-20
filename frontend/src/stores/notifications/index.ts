import NotificationsStore from './notifications-store';
import { Notification } from './types';

const notificationsStore = new NotificationsStore();

export {
  Notification,
  notificationsStore
};
