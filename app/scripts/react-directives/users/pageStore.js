'use strict';

import { makeAutoObservable } from 'mobx';
import PageWrapperStore from '../components/page-wrapper/pageWrapperStore';
import { StringStore } from '../forms/stringStore';
import i18n from '../../i18n/react/config';
import { FormStore } from '../forms/formStore';
import { makeNotEmptyValidator } from '../forms/stringValidators';
import FormModalState from '../components/modals/formModalState';

class UsersPageAccessLevelStore {
  constructor(rolesFactory) {
    this.isAdmin = rolesFactory.current.roles.isAdmin;
    this.accessGranted = this.isAdmin || rolesFactory.notConfiguredUsers.length;
    this.allowToEditUser = this.isAdmin;
    this.allowToEditOperator = this.isAdmin;
    this.allowToEditAdmin = this.accessGranted;
  }
}

class UsersPageStore {
  constructor(rolesFactory) {
    this.rolesFactory = rolesFactory;
    this.pageWrapperStore = new PageWrapperStore(i18n.t('users.title'));
    this.accessLevelStore = new UsersPageAccessLevelStore(rolesFactory);
    this.userParamsStore = new FormStore('userParams', {
      login: new StringStore({
        name: i18n.t('users.labels.login'),
        validator: makeNotEmptyValidator(),
      }),
      password: new StringStore({
        name: i18n.t('users.labels.password'),
        validator: makeNotEmptyValidator(),
      }),
    });
    this.formModalState = new FormModalState();
    this.pageWrapperStore.setLoading(false);

    makeAutoObservable(this);
  }

  async showUserEditModal() {
    this.userParamsStore.reset();
    return await this.formModalState.show(
      i18n.t('users.labels.edit-user'),
      this.userParamsStore,
      i18n.t('users.buttons.save')
    );
  }

  async putSettings(userType) {
    const user = await this.showUserEditModal();
    if (user) {
      user['type'] = userType;
      this.pageWrapperStore.clearError();
      this.pageWrapperStore.setLoading(true);
      const res = await fetch('/auth/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
      });
      this.rolesFactory.setConfiguredUser(userType);
      this.pageWrapperStore.setLoading(false);
      if (!res.ok) {
        switch (res.status) {
          case 403:
            this.pageWrapperStore.setError(i18n.t('users.errors.forbidden'));
            break;
          case 404:
            this.pageWrapperStore.setError(i18n.t('users.errors.old-backend'));
            break;
          default:
            res
              .text()
              .then(text =>
                this.pageWrapperStore.setError(i18n.t('users.errors.unknown', { msg: text }))
              );
        }
      }
    }
  }

  async editUser() {
    try {
      await this.putSettings('user');
    } catch (error) {
      this.pageWrapperStore.setError(error);
    }
  }

  async editOperator() {
    try {
      await this.putSettings('operator');
    } catch (error) {
      this.pageWrapperStore.setError(error);
    }
  }

  async editAdmin() {
    try {
      await this.putSettings('admin');
      if (!this.accessLevelStore.isAdmin) {
        window.location.href = '/login';
      }
    } catch (error) {
      this.pageWrapperStore.setError(error);
    }
  }
}

export default UsersPageStore;
