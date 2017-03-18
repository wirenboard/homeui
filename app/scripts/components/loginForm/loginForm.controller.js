class LoginFormCtrl {
  constructor ($window, $state, $location, errors, mqttClient, whenMqttReady, ConfigEditorProxy, uiConfig, webuiConfigPath) {
    'ngInject';

    this.localStorage = $window.localStorage;
    this.state = $state;
    this.currentHost = $location.host();

    this.errors = errors;
    this.mqttClient = mqttClient;
    this.whenMqttReady = whenMqttReady;
    this.ConfigEditorProxy = ConfigEditorProxy;
    this.uiConfig = uiConfig;
    this.webuiConfigPath = webuiConfigPath;

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
      this.host = this.currentHost;
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
    // Update settings in Local Storage
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

    if (this.host && this.port) {
      let clientID = 'contactless-' + this.randomString(10);
      console.log('Try to connect as ' + clientID);
      this.mqttClient.connect(this.host, this.port, clientID, this.user, this.password);

      // Try to obtain WebUI configs
      this.whenMqttReady()
        .then(() => {
          return this.ConfigEditorProxy.Load({ path: this.webuiConfigPath })
        })
        .then((result) => {
          console.log('LOAD CONF: %o', result.content);
          this.uiConfig.ready(result.content);
        })
        .catch(this.errors.catch('Error loading WebUI config'));
    }
  }

  //...........................................................................
  randomString(length) {
    var text = '';
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (var i = 0; i < length; i++)
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    return text;
  }
}

//-----------------------------------------------------------------------------
export default LoginFormCtrl;
