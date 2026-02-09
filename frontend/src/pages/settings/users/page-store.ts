import { type AxiosError } from 'axios';
import { makeAutoObservable, runInAction } from 'mobx';
import { authStore, UserRole, type User } from '@/stores/auth';
import { getDeviceInfo, makeHttpsUrlOrigin } from '@/utils/httpsUtils';
import { request } from '@/utils/request';
import i18n from '~/i18n/react/config';
import type { UserParams } from './components/edit-user/types';

function sortUsers(users: User[]) {
  users.sort((a, b) => {
    if (a.type === b.type) {
      return a.login.localeCompare(b.login);
    }
    return a.type.localeCompare(b.type);
  });
}

class UsersPageStore {
  public isLoading = false;
  public errors = [];
  public users: User[] = [];
  public httpsDomainName = '';
  public autologinUser = null;
  public autologinOptions = [];
  public showEnableHttpsConfirmModal: () => Promise<boolean>;
  public showUserEditModal: () => Promise<UserParams>;

  constructor() {
    makeAutoObservable(this);
  }

  processFetchError(fetchResponse: AxiosError) {
    switch (fetchResponse.status) {
      case 403: {
        this.errors = [{ variant: 'danger', text: i18n.t('users.errors.forbidden') }];
        break;
      }
      case 404: {
        this.errors = [{ variant: 'danger', text: i18n.t('users.errors.old-backend') }];
        break;
      }
      default: {
        const msg = fetchResponse.response?.data || fetchResponse.message || '';
        this.errors = [
          { variant: 'danger', text: i18n.t('users.errors.unknown', { msg, interpolation: { escapeValue: false } }) },
        ];
      }
    }
  }

  async loadUsers() {
    this.isLoading = true;
    try {
      const users = await authStore.getUsers().then(({ data }) => data);
      this.setUsers(users);
      if (!this.users.length) {
        const deviceInfo = await getDeviceInfo();
        this.httpsDomainName = makeHttpsUrlOrigin(deviceInfo);
      }
    } catch (error) {
      this.processFetchError(error);
      this.setUsers([]);
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  refreshAutologinUserOptions() {
    this.autologinOptions = [
      {
        value: null,
        label: i18n.t('users.labels.no-autologin'),
      },
    ];
    let autologinUser = null;
    this.users.forEach((user) => {
      if (user.type === UserRole.User) {
        this.autologinOptions.push({
          value: user.id,
          label: user.login,
        });
        if (user.autologin) {
          autologinUser = user.id;
        }
      }
    });
    if (autologinUser) {
      this.autologinUser = autologinUser;
    } else {
      this.autologinUser = null;
    }
  }

  setUsers(users: User[]) {
    sortUsers(users);
    this.users = users;
    this.refreshAutologinUserOptions();
  }

  async setAutologinUser(userId: string) {
    let oldAutologinUser = this.users.find((u) => u.autologin);
    if (oldAutologinUser?.id === userId) {
      return;
    }

    if (oldAutologinUser) {
      await this.fetchWrapper(() => authStore.updateUser(oldAutologinUser.id, { autologin: false }));
      oldAutologinUser.autologin = false;
    }

    this.autologinUser = userId;

    const newAutologinUser = this.users.find((u) => u.id === userId);
    if (newAutologinUser) {
      await this.fetchWrapper(() => authStore.updateUser(userId, { autologin: true }));
      newAutologinUser.autologin = true;
    }
  }

  async fetchWrapper(fetchFn: () => Promise<any>) {
    try {
      this.errors = [];
      this.isLoading = true;
      return await fetchFn();
    } catch (error) {
      this.processFetchError(error);
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
    return null;
  }

  async confirmSetupHttps() {
    if (window.location.protocol === 'https:') {
      return true;
    }
    if (!await this.showEnableHttpsConfirmModal()) {
      return true;
    }
    this.errors = [];
    this.isLoading = true;

    try {
      await request.patch('/api/https', { enabled: true });
      window.location.reload();
      return false;
    } catch (error) {
      this.processFetchError(error);
    } finally {
      this.isLoading = false;
    }
    return false;
  }

  async addUser() {
    if (!authStore.areUsersConfigured) {
      if (!await this.confirmSetupHttps()) {
        return;
      }
    }
    const user = await this.showUserEditModal();
    if (!user) {
      return;
    }
    const res = await this.fetchWrapper(() => authStore.addUser(user));
    if (res === null) {
      return;
    }
    if (!authStore.areUsersConfigured) {
      location.reload();
      return;
    }
    runInAction(() => {
      user.id = res.data;
      this.users.push(user);
      sortUsers(this.users);
      this.refreshAutologinUserOptions();
    });
  }

  async editUser(user: User) {
    const modifiedUser = await this.showUserEditModal();

    if (!modifiedUser) {
      return;
    }
    const res = await this.fetchWrapper(() => authStore.updateUser(user.id, modifiedUser));
    if (res === null) {
      return;
    }

    runInAction(() => {
      this.users.map((item) => {
        if (item.id === user.id) {
          item.login = modifiedUser.login;
          item.type = modifiedUser.type;
        }
        return item;
      });

      if (modifiedUser.type !== UserRole.User) {
        user.autologin = false;
      }
      sortUsers(this.users);
      this.refreshAutologinUserOptions();
    });
  }

  async deleteUser(userId: string) {
    const res = await this.fetchWrapper(() => authStore.deleteUser(userId));
    if (res === null) {
      return;
    }
    runInAction(() => {
      this.users = this.users.filter((u) => u.id !== userId);
    });
    this.refreshAutologinUserOptions();
  }

  get onlyOneAdmin() {
    return this.users.filter((user) => user.type === UserRole.Admin).length === 1;
  }
}

export const store = new UsersPageStore();
