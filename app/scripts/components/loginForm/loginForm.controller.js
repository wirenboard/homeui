class LoginFormCtrl {
  constructor ($window, mqttClient, $state) {
    'ngInject';

    this.localStorage = $window.localStorage;
    this.mqttClient = mqttClient;
    this.state = $state;

    this.loginSettings = {};
    this.loginSettings.host = this.localStorage['host'];
    this.loginSettings.port = this.localStorage['port'];
    this.loginSettings.user = this.localStorage['user'];
    this.loginSettings.password = this.localStorage['password'];
    this.loginSettings.prefix = this.localStorage['prefix'];

    if (this.loginSettings.user || this.loginSettings.password) {
      this.loginSettings.useCredentials = true;
    } else {
      this.loginSettings.useCredentials = false;
    }
  }

//-----------------------------------------------------------------------------
  $postLink() {
    let host = this.loginSettings.host;
    let port = this.loginSettings.port;
    let useCredentials = this.loginSettings.useCredentials;
    let user = this.loginSettings.user;
    let password = this.loginSettings.password;
    let prefix = this.loginSettings.prefix;

    if (host) {
      this.host = host;
    } else {
      this.host = 'localhost';
    }
    if (port) {
      this.port = port;
    } else {
      this.port = '1883';
    }
    if (useCredentials) {
      this.useCredentials = useCredentials;
    } else {
      this.useCredentials = false;
    }
    if (user) {
      this.user = user;
    } else {
      this.user = '';
    }
    if (password) {
      this.password = password;
    } else {
      this.password = '';
    }
    if (prefix) {
      this.prefix = prefix;
    } else {
      this.prefix = '';
    }
  }

//-----------------------------------------------------------------------------
  updateLoginSettings() {
    this.localStorage.setItem('host', this.host);
    this.localStorage.setItem('port', this.port);

    this.localStorage.setItem('prefix', this.prefix);

    if (this.useCredentials) {
      this.localStorage.setItem('user', this.user);
      this.localStorage.setItem('password', this.password);
    } else {
      this.localStorage.setItem('user', '');
      this.localStorage.setItem('password', '');
    }
  }
}

//-----------------------------------------------------------------------------
export default LoginFormCtrl;
