class LoginFormCtrl {
  //...........................................................................
  constructor($window, $rootScope, $state, $location, rolesFactory) {
    'ngInject';

    var currentURL = new URL('/mqtt', $window.location.href);
    currentURL.protocol = currentURL.protocol.replace('http', 'ws');

    this.rootScope = $rootScope;
    this.isDev = $window.location.host === 'localhost:8080'; // FIXME: find more beautiful way to detect local dev
    this.localStorage = $window.localStorage;
    this.state = $state;
    this.rolesFactory = rolesFactory;
    this.currentURL = currentURL.href;
    this.loginSettings = {};
    this.loginSettings.url = this.localStorage['url'];
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
    let url = this.loginSettings.url;
    let useCredentials = this.loginSettings.useCredentials;
    let user = this.loginSettings.user;
    let password = this.loginSettings.password;
    let prefix = this.loginSettings.prefix;

    if (url) {
      this.url = url;
    } else {
      this.url = this.currentURL;
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

  //...........................................................................
  updateLoginSettings() {
    // Update settings in Local Storage
    if (this.isDev) {
      this.localStorage.setItem('url', this.url);
    }

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
      url: this.url,
      user: this.user,
      password: this.password,
      prefix: this.prefix,
      isDev: this.isDev,
    };

    this.rootScope.requestConfig(loginData);
    location.reload();
  }
}

//-----------------------------------------------------------------------------
export default LoginFormCtrl;
