import { makeObservable, action, observable } from 'mobx';
import { FormStore } from '../forms/formStore';
import { StringStore } from '../forms/stringStore';
import i18n from '../../i18n/react/config';
import { makeNotEmptyValidator } from '../forms/stringValidators';

class LoginModalStore {
  constructor(active, rolesFactory, httpWarning) {
    this.active = !!active;
    this.login = '';
    this.password = '';
    this.error = false;
    this.httpWarning = !!httpWarning;
    this.rolesFactory = rolesFactory;

    this.formStore = new FormStore('login.title', {
      login: new StringStore({
        name: i18n.t('login.labels.login'),
        validator: makeNotEmptyValidator(),
      }),
      password: new StringStore({
        name: i18n.t('login.labels.password'),
        validator: makeNotEmptyValidator(),
      }),
    });

    makeObservable(this, {
      active: observable,
      login: observable,
      password: observable,
      error: observable,
      httpWarning: observable,
      setLogin: action,
      setPassword: action,
      postLogin: action,
      show: action,
      hide: action,
      setError: action,
      clearError: action,
      setHttpWarning: action,
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
    this.active = true;
  }

  postLogin() {
    this.clearError();
    Object.values(this.formStore.params).forEach(param => param.setReadOnly(true));
    fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(this.formStore.value),
    }).then(response => {
      if (response.ok) {
        response.json().then(data => {
          this.rolesFactory.setRole(data.user_type);
          this.hide();
        });
      } else {
        this.setError();
        Object.values(this.formStore.params).forEach(param => param.setReadOnly(false));
      }
    });
  }
}

export default LoginModalStore;
