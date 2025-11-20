import { makeAutoObservable, runInAction } from 'mobx';
import { type Notification } from './types';

export default class NotificationsStore {
  public notifications: Notification[] = [];

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  showNotification(notification: Notification) {
    const timeout = notification.timeout || 4000;

    const uniqueId = Symbol('id');
    this.notifications.push({ ...notification, id: uniqueId });

    setTimeout(() => {
      runInAction(() => {
        this.notifications = this.notifications.filter((item) => item.id !== uniqueId);
      });
    }, timeout);
  }
}
