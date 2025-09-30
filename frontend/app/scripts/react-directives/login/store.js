import { makeObservable, action, observable } from 'mobx';
import i18n from '../../i18n/react/config';
import { FormStore } from '../forms/formStore';
import { StringStore } from '../forms/stringStore';

class LoginPageStore {
  constructor(rolesFactory, successCallback, cancelCallback) {
    this.error = false;
    this.rolesFactory = rolesFactory;
    this.loading = false;
    this.successCallback = successCallback;
    this.cancelCallback = cancelCallback;

    this.formStore = new FormStore('login.title', {
      login: new StringStore({
        name: i18n.t('login.labels.login'),
        required: true,
        autocomplete: 'username',
      }),
      password: new StringStore({
        name: i18n.t('login.labels.password'),
        required: true,
        editType: 'password',
        autocomplete: 'current-password',
      }),
    });

    makeObservable(this, {
      error: observable,
      loading: observable,
      postLogin: action,
      setError: action,
      clearError: action,
      setLoading: action,
    });
  }

  setError() {
    this.error = i18n.t('login.errors.failed');
  }

  clearError() {
    this.error = null;
  }

  setLoading(loading) {
    this.loading = loading;
    Object.values(this.formStore.params).forEach((param) => param.setReadOnly(loading));
  }

  async postLogin() {
    this.setLoading(true);
    this.clearError();
    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.formStore.value),
      });
      if (response.ok) {
        const data = await response.json();
        this.rolesFactory.setRole(data.user_type);
        this.rolesFactory.setUsersAreConfigured(true);
        this.rolesFactory.setCurrentUserIsAutologinUser(false);
        this.successCallback();
        return;
      }
    } catch (error) {
      /* empty */
    }
    this.setError();
    this.setLoading(false);
  }
}

export default LoginPageStore;
