'use strict';

import { makeAutoObservable, runInAction } from 'mobx';
import PageWrapperStore from '../components/page-wrapper/pageWrapperStore';
import { StringStore } from '../forms/stringStore';
import i18n from '../../i18n/react/config';
import { FormStore } from '../forms/formStore';
import { makeNotEmptyValidator } from '../forms/stringValidators';
import FormModalState from '../components/modals/formModalState';
import { OptionsStore } from '../forms/optionsStore';
import ConfirmModalState from '../components/modals/confirmModalState';

function sortUsers(users) {
  users.sort((a, b) => {
    if (a.type === b.type) {
      return a.login.localeCompare(b.login);
    }
    return a.type.localeCompare(b.type);
  });
}

class UsersPageAccessLevelStore {
  constructor() {
    this.notConfiguredAdmin = false;
    this.accessGranted = true;

    makeAutoObservable(this);
  }

  setNotConfiguredAdmin() {
    this.notConfiguredAdmin = true;
    this.accessGranted = true;
  }

  setAccessNotGranted() {
    this.accessGranted = false;
  }
}

class UsersPageStore {
  constructor(rolesFactory) {
    this.pageWrapperStore = new PageWrapperStore(i18n.t('users.title'));
    this.accessLevelStore = new UsersPageAccessLevelStore();
    this.userParamsStore = new FormStore('userParams', {
      login: new StringStore({
        name: i18n.t('users.labels.login'),
        validator: makeNotEmptyValidator(),
      }),
      password: new StringStore({
        name: i18n.t('users.labels.password'),
        validator: makeNotEmptyValidator(),
      }),
      type: new OptionsStore({
        name: i18n.t('users.labels.type'),
        options: [
          { value: 'user', label: i18n.t('users.labels.user') },
          { value: 'operator', label: i18n.t('users.labels.operator') },
          { value: 'admin', label: i18n.t('users.labels.admin') },
        ],
        value: 'user',
      }),
    });
    this.formModalState = new FormModalState();
    this.confirmModalState = new ConfirmModalState();
    this.users = [];

    makeAutoObservable(this);

    rolesFactory.whenReady().then(() => {
      if (rolesFactory.notConfiguredAdmin) {
        this.accessLevelStore.setNotConfiguredAdmin();
        this.pageWrapperStore.setLoading(false);
        return;
      }
      if (rolesFactory.current.roles.isAdmin) {
        this.loadUsers();
      } else {
        this.accessLevelStore.setAccessNotGranted();
        this.pageWrapperStore.setLoading(false);
      }
    });
  }

  processFetchError(fetchResponse) {
    switch (fetchResponse.status) {
      case 403:
        this.pageWrapperStore.setError(i18n.t('users.errors.forbidden'));
        break;
      case 404:
        this.pageWrapperStore.setError(i18n.t('users.errors.old-backend'));
        break;
      default:
        fetchResponse
          .text()
          .then(text =>
            this.pageWrapperStore.setError(
              i18n.t('users.errors.unknown', { msg: text, interpolation: { escapeValue: false } })
            )
          );
    }
  }

  async showUserEditModal() {
    return this.formModalState.show(
      i18n.t('users.labels.user'),
      this.userParamsStore,
      i18n.t('users.buttons.save')
    );
  }

  async loadUsers() {
    this.pageWrapperStore.setLoading(true);
    try {
      const res = await fetch('/auth/users');
      if (res.ok) {
        this.setUsers(await res.json());
      } else {
        this.processFetchError(res);
      }
    } catch (error) {
      this.pageWrapperStore.setError(error);
      this.setUsers([]);
    } finally {
      this.pageWrapperStore.setLoading(false);
    }
  }

  setUsers(users) {
    sortUsers(users);
    this.users = users;
  }

  async fetchWrapper(fetchFn) {
    try {
      this.pageWrapperStore.clearError();
      this.pageWrapperStore.setLoading(true);
      const res = await fetchFn();
      if (res.ok) {
        this.pageWrapperStore.setLoading(false);
        return res;
      }
      this.processFetchError(res);
    } catch (error) {
      this.pageWrapperStore.setError(error);
    }
    this.pageWrapperStore.setLoading(false);
    return null;
  }

  async addUser() {
    this.userParamsStore.reset();
    if (this.accessLevelStore.notConfiguredAdmin) {
      this.userParamsStore.params.type.setValue('admin');
      this.userParamsStore.params.type.setReadOnly(true);
    }
    const user = await this.showUserEditModal();
    if (!user) {
      return;
    }
    const res = await this.fetchWrapper(() =>
      fetch('/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
      })
    );
    if (res === null) {
      return;
    }
    if (this.accessLevelStore.notConfiguredAdmin) {
      location.reload();
      return;
    }
    res.text().then(text => {
      runInAction(() => {
        user.id = text;
        this.users.push(user);
        sortUsers(this.users);
      });
    });
  }

  async editUser(user) {
    this.userParamsStore.reset();
    this.userParamsStore.setValue(user);
    const modifiedUser = await this.showUserEditModal();
    if (!modifiedUser) {
      return;
    }
    const res = await this.fetchWrapper(() =>
      fetch(`/auth/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modifiedUser),
      })
    );
    if (res == null) {
      return;
    }
    user.name = modifiedUser.name;
    user.type = modifiedUser.type;
    sortUsers(this.users);
  }

  async showDeleteConfirmModal(user) {
    return this.confirmModalState.show(
      i18n.t('users.labels.confirm-delete', { name: user.login }),
      [
        {
          label: i18n.t('users.buttons.delete'),
          type: 'danger',
        },
      ]
    );
  }

  async deleteUser(user) {
    if ((await this.showDeleteConfirmModal(user)) === 'ok') {
      const res = await this.fetchWrapper(() =>
        fetch(`/auth/users/${user.id}`, {
          method: 'DELETE',
        })
      );
      if (res === null) {
        return;
      }
      runInAction(() => {
        this.users = this.users.filter(u => u.id !== user.id);
      });
    }
  }
}

export default UsersPageStore;
