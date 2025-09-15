import { makeAutoObservable, runInAction } from 'mobx';
import i18n from '../../i18n/react/config';
import AccessLevelStore from '../components/access-level/accessLevelStore';
import ConfirmModalState from '../components/modals/confirmModalState';
import FormModalState from '../components/modals/formModalState';
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
    this.autologinUserStore = new OptionsStore({
      options: [
        {
          value: null,
          label: i18n.t('users.labels.no-autologin'),
        },
      ],
      value: null,
    }),
    this.users = [];

    makeAutoObservable(this);

    if (this.accessLevelStore.accessGranted) {
      this.loadUsers();
    }
  }

  async processFetchError(fetchResponse) {
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
        const text = await fetchResponse.text();
        this.pageWrapperStore.setError(
          i18n.t('users.errors.unknown', { msg: text, interpolation: { escapeValue: false } })
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
      const res = await fetch('/auth/users');
      if (res.ok) {
        this.setUsers(await res.json());
      } else {
        await this.processFetchError(res);
      }
    } catch (error) {
      this.pageWrapperStore.setError(error);
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
      this.fetchWrapper(() =>
        fetch(`/auth/users/${oldAutologinUser.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ autologin: false }),
        })
      );
      oldAutologinUser.autologin = false;
    }

    this.autologinUserStore.setValue(autologinUserOption.value);

    const newAutologinUser = this.users.find((u) => u.id === autologinUserOption.value);
    if (newAutologinUser) {
      this.fetchWrapper(() =>
        fetch(`/auth/users/${autologinUserOption.value}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ autologin: true }),
        })
      );
      newAutologinUser.autologin = true;
    }
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
      await this.processFetchError(res);
    } catch (error) {
      this.pageWrapperStore.setError(error);
    }
    this.pageWrapperStore.setLoading(false);
    return null;
  }

  async addUser() {
    this.userParamsStore.reset();
    if (!this.accessLevelStore.usersAreConfigured) {
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
    if (!this.accessLevelStore.usersAreConfigured) {
      location.reload();
      return;
    }
    res.text().then((text) => {
      runInAction(() => {
        user.id = text;
        this.users.push(user);
        sortUsers(this.users);
        this.refreshAutologinUserOptions();
      });
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
    const res = await this.fetchWrapper(() =>
      fetch(`/auth/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modifiedUser),
      })
    );
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
