import { makeObservable, action, observable } from 'mobx';
import { FormStore } from '../forms/formStore';
import { StringStore } from '../forms/stringStore';
import i18n from '../../i18n/react/config';

class LoginModalStore {
  constructor(active, rolesFactory, httpWarning) {
    this.active = !!active;
    this.login = '';
    this.password = '';
    this.error = false;
    this.httpWarning = !!httpWarning;
    this.rolesFactory = rolesFactory;
    this.loading = false;

    this.formStore = new FormStore('login.title', {
      login: new StringStore({
        name: i18n.t('login.labels.login'),
      }),
      password: new StringStore({
        name: i18n.t('login.labels.password'),
      }),
    });

    makeObservable(this, {
      active: observable,
      login: observable,
      password: observable,
      error: observable,
      httpWarning: observable,
      loading: observable,
      setLogin: action,
      setPassword: action,
      postLogin: action,
      show: action,
      hide: action,
      setError: action,
      clearError: action,
      setHttpWarning: action,
      setLoading: action,
    });
  }

  setLogin(login) {
    this.login = login;
  }

  setPassword(password) {
    this.password = password;
  }

  setError() {
    this.error = true;
  }

  setHttpWarning(httpWarning) {
    this.httpWarning = httpWarning;
  }

  clearError() {
    this.error = false;
  }

  hide() {
    this.active = false;
  }

  show() {
    this.clearError();
    this.setLogin('');
    this.setPassword('');
    this.setLoading(false);
    this.active = true;
  }

  setLoading(loading) {
    this.loading = loading;
    Object.values(this.formStore.params).forEach(param => param.setReadOnly(loading));
  }

  async postLogin() {
    this.setLoading(true);
    this.clearError();
    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.formStore.value),
      });
      if (response.ok) {
        const data = await response.json();
        this.rolesFactory.setRole(data.user_type);
        this.hide();
        return;
      }
    } catch (error) {
      /* empty */
    }
    this.setError();
    this.setLoading(false);
  }
}

export default LoginModalStore;
