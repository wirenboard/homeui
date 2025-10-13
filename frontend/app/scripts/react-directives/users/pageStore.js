import { makeAutoObservable, runInAction } from 'mobx';
import { authStore } from '@/stores/auth';
import { getDeviceInfo, makeHttpsUrlOrigin } from '@/utils/httpsUtils';
import { request } from '@/utils/request';
import i18n from '../../i18n/react/config';
import AccessLevelStore from '../components/access-level/accessLevelStore';
import ConfirmModalState from '../components/modals/confirmModalState';
import FormModalState from '../components/modals/formModalState';
import SimpleModalState from '../components/modals/simpleModalState';
import PageWrapperStore from '../components/page-wrapper/pageWrapperStore';
import { FormStore } from '../forms/formStore';
import { OptionsStore } from '../forms/optionsStore';
import { StringStore } from '../forms/stringStore';
import { makeNotEmptyValidator } from '../forms/stringValidators';

function sortUsers(users) {
  users.sort((a, b) => {
    if (a.type === b.type) {
      return a.login.localeCompare(b.login);
    }
    return a.type.localeCompare(b.type);
  });
}

class UsersPageStore {
  constructor(rolesFactory) {
    this.pageWrapperStore = new PageWrapperStore(i18n.t('users.title'));
    this.accessLevelStore = new AccessLevelStore(rolesFactory);
    this.accessLevelStore.setRole(rolesFactory.ROLE_THREE);
    this.userParamsStore = new FormStore('userParams', {
      login: new StringStore({
        name: i18n.t('users.labels.login'),
        validator: makeNotEmptyValidator(),
        autocomplete: 'username',
      }),
      password: new StringStore({
        name: i18n.t('users.labels.password'),
        validator: makeNotEmptyValidator(),
        isHideErrorText: true,
        showIndicator: true,
        editType: 'password',
        autocomplete: 'new-password',
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
    this.simpleModalState = new SimpleModalState();
    this.autologinUserStore = new OptionsStore({
      options: [
        {
          value: null,
          label: i18n.t('users.labels.no-autologin'),
        },
      ],
      value: null,
    });
    this.users = [];
    this.httpsDomainName = '';

    makeAutoObservable(this);

    if (this.accessLevelStore.accessGranted) {
      this.loadUsers();
    }
  }

  processFetchError(fetchResponse) {
    switch (fetchResponse.status) {
      case 403: {
        this.pageWrapperStore.setError(i18n.t('users.errors.forbidden'));
        break;
      }
      case 404: {
        this.pageWrapperStore.setError(i18n.t('users.errors.old-backend'));
        break;
      }
      default: {
        this.pageWrapperStore.setError(
          i18n.t('users.errors.unknown', { msg: fetchResponse.message, interpolation: { escapeValue: false } })
        );
      }
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
      this.pageWrapperStore.setLoading(false);
    }
  }

  refreshAutologinUserOptions() {
    let autoLoginOptions = [
      {
        value: null,
        label: i18n.t('users.labels.no-autologin'),
      },
    ];
    let autologinUser = null;
    this.users.forEach((user) => {
      if (user.type === 'user') {
        autoLoginOptions.push({
          value: user.id,
          label: user.login,
        });
        if (user.autologin) {
          autologinUser = user.id;
        }
      }
    });
    this.autologinUserStore.setOptions(autoLoginOptions);
    if (autologinUser) {
      this.autologinUserStore.setValue(autologinUser);
    } else {
      this.autologinUserStore.setValue(null);
    }
  }

  setUsers(users) {
    sortUsers(users);
    this.users = users;
    this.refreshAutologinUserOptions();
  }

  setAutologinUser(autologinUserOption) {
    let oldAutologinUser = this.users.find((u) => u.autologin);
    if (oldAutologinUser?.id === autologinUserOption.value) {
      return;
    }

    if (oldAutologinUser) {
      this.fetchWrapper(() => authStore.updateUser(oldAutologinUser.id, { autologin: false }));
      oldAutologinUser.autologin = false;
    }

    this.autologinUserStore.setValue(autologinUserOption.value);

    const newAutologinUser = this.users.find((u) => u.id === autologinUserOption.value);
    if (newAutologinUser) {
      this.fetchWrapper(() => authStore.updateUser(autologinUserOption.value, { autologin: true }));
      newAutologinUser.autologin = true;
    }
  }

  async fetchWrapper(fetchFn) {
    try {
      this.pageWrapperStore.clearError();
      this.pageWrapperStore.setLoading(true);
      return await fetchFn();
    } catch (error) {
      this.processFetchError(error);
    } finally {
      this.pageWrapperStore.setLoading(false);
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
    this.pageWrapperStore.clearError();
    this.pageWrapperStore.setLoading(true);
    try {
      await request.patch('/api/https', { enabled: true });
      window.location.reload();
      return false;
    } catch (error) {
      this.processFetchError(error);
    } finally {
      this.pageWrapperStore.setLoading(false);
    }
    return false;
  }

  async addUser() {
    this.userParamsStore.reset();
    if (!this.accessLevelStore.rolesFactory.usersAreConfigured) {
      if (!await this.confirmSetupHttps()) {
        return;
      }
      this.userParamsStore.params.type.setValue('admin');
      this.userParamsStore.params.type.setReadOnly(true);
    }
    const user = await this.showUserEditModal();
    if (!user) {
      return;
    }
    const res = await this.fetchWrapper(() => authStore.addUser(user));
    if (res === null) {
      return;
    }
    if (!this.accessLevelStore.rolesFactory.usersAreConfigured) {
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

  async editUser(user) {
    this.userParamsStore.reset();
    this.userParamsStore.setValue(user);
    if (user.type === 'admin' && this.onlyOneAdmin) {
      this.userParamsStore.params.type.setReadOnly(true);
    }
    const modifiedUser = await this.showUserEditModal();
    if (!modifiedUser) {
      return;
    }
    const res = await this.fetchWrapper(() => authStore.updateUser(user.id, modifiedUser));
    if (res === null) {
      return;
    }
    user.name = modifiedUser.name;
    user.type = modifiedUser.type;
    if (modifiedUser.type !== 'user') {
      user.autologin = false;
    }
    sortUsers(this.users);
    this.refreshAutologinUserOptions();
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

  async showEnableHttpsConfirmModal() {
    return this.simpleModalState.show(
      i18n.t('users.labels.https'),
      i18n.t('users.buttons.enable-https')
    );
  }

  async deleteUser(user) {
    if ((await this.showDeleteConfirmModal(user)) === 'ok') {
      const res = await this.fetchWrapper(() => authStore.deleteUser(user.id));
      if (res === null) {
        return;
      }
      runInAction(() => {
        this.users = this.users.filter((u) => u.id !== user.id);
      });
      this.refreshAutologinUserOptions();
    }
  }

  get onlyOneAdmin() {
    return this.users.filter((user) => user.type === 'admin').length === 1;
  }
}

export default UsersPageStore;
