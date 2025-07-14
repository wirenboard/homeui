class LoginFormCtrl {
  //...........................................................................
  constructor($window, $rootScope, $state, $location) {
    'ngInject';

    this.rootScope = $rootScope;
    this.localStorage = $window.localStorage;
    this.state = $state;
    this.loginSettings = {};
    this.loginSettings.user = this.localStorage['user'];
    this.loginSettings.password = this.localStorage['password'];
    this.loginSettings.prefix = this.localStorage['prefix'];
    if (this.loginSettings.user || this.loginSettings.password) {
      this.loginSettings.useCredentials = true;
    } else {
      this.loginSettings.useCredentials = false;
    }
  }

  //...........................................................................
  $postLink() {
    let useCredentials = this.loginSettings.useCredentials;
    let user = this.loginSettings.user;
    let password = this.loginSettings.password;
    let prefix = this.loginSettings.prefix;

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

  //...........................................................................
  updateLoginSettings() {
    // Update settings in Local Storage

    this.localStorage.setItem('prefix', this.prefix);

    if (this.useCredentials) {
      this.localStorage.setItem('user', this.user);
      this.localStorage.setItem('password', this.password);
    } else {
      this.localStorage.setItem('user', '');
      this.localStorage.setItem('password', '');
    }

    // Try to fetch UI config this new settings
    let loginData = {
      user: this.user,
      password: this.password,
      prefix: this.prefix,
    };

    this.rootScope.requestConfig(loginData);
    location.reload();
  }
}

//-----------------------------------------------------------------------------
export default LoginFormCtrl;
