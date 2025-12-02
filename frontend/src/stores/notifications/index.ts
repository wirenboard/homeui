import NotificationsStore from './notifications-store';
import type { Notification } from './types';

const notificationsStore = new NotificationsStore();

export {
  Notification,
  notificationsStore
};
