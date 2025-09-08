class NavigationCtrl {
  constructor(
    $scope,
    $location,
    EditorProxy,
    ConfigEditorProxy,
    mqttClient,
    whenMqttReady,
    errors,
    uiConfig,
    rolesFactory,
    $rootScope,
    $state
  ) {
    'ngInject';

    $scope.roles = rolesFactory;
    $rootScope.roles = rolesFactory;

    $scope.isActive = function (viewLocation) {
      return viewLocation === $location.path();
    };

    $scope.dashboards = () => {
      return uiConfig.data.dashboards.filter(dashboard => !dashboard.isNew);
    };

    $scope.isConnected = function () {
      return mqttClient.isConnected();
    };

    var scripts = [],
      rules = [],
      devices = [],
      configs = [],
      needToLoadScripts = false,
      needToLoadConfigs = false;

    whenMqttReady().then(function () {
      if (rolesFactory.checkRights(rolesFactory.ROLE_THREE)) {
        needToLoadScripts = needToLoadConfigs = true;
        mqttClient.subscribe('/wbrules/updates/+', function () {
          needToLoadScripts = true;
        });
      }
    });

    $scope.getScripts = function () {
      if (needToLoadScripts) {
        needToLoadScripts = false;
        EditorProxy.List()
          .then(function (result) {
            scripts = result;
            rules = this.collectLocs(scripts, 'rules');
            devices = this.collectLocs(scripts, 'devices');
          })
          .catch(errors.catch('Error listing the scripts'));
      }
      return scripts;
    };

    $scope.getRules = function getRules() {
      this.getScripts();
      return rules;
    };

    $scope.getVirtualDevices = function getVirtualDevices() {
      this.getScripts();
      return devices;
    };

    $scope.getConfigs = function () {
      if (needToLoadConfigs) {
        needToLoadConfigs = false;
        ConfigEditorProxy.List()
          .then(function (result) {
            configs = result;
          })
          .catch(errors.catch('Error listing the configs'));
      }
      return configs;
    };

    $scope.toggleNavigation = function () {
      const pageWrapperClassList = document.getElementById('overlay').classList;
      const overlayClass = 'overlay';

      pageWrapperClassList.contains(overlayClass)
        ? pageWrapperClassList.remove(overlayClass)
        : pageWrapperClassList.add(overlayClass);
    };

    $scope.showAccessControl = function () {
      return rolesFactory.current?.roles?.isAdmin;
    };

    $scope.showUserMenu = function () {
      return rolesFactory.usersAreConfigured && rolesFactory.isAuthenticated();
    };

    $scope.userMenuLabel = function () {
      return rolesFactory.currentUserIsAutologinUser ? 'app.buttons.switch-user' : 'app.buttons.logout';
    };

    $scope.logout = function () {
      if (rolesFactory.currentUserIsAutologinUser) {
        // If the user is an autologin user, just show login page to select another user.
        // No need to log out
        $state.go('login');
      } else {
        fetch('/auth/logout', {
          method: 'POST',
        }).then(() => {
          location.reload();
        });
      }
    };
  }

  //-----------------------------------------------------------------------------
  collectLocs(scripts, member) {
    var m = {};
    scripts.forEach(function (script) {
      (script[member] || []).forEach(function (loc) {
        m[loc.name] = {
          virtualPath: script.virtualPath,
          name: loc.name,
          line: loc.line,
        };
      });
    });
    var r = [];
    Object.keys(m)
      .sort()
      .forEach(function (name) {
        r.push(m[name]);
      });
    return r;
  }
}

//-----------------------------------------------------------------------------
export default NavigationCtrl;
