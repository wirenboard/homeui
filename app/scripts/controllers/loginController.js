class LoginCtrl {
  constructor($window, $location, $routeParams) {
    'ngInject';

    if ($routeParams.id && $routeParams.id === 'wb_008641ccdc3d') {
      if ($window.localStorage['user'] === $routeParams.id) {
        $location.path('/');
      } else {
        $window.localStorage.setItem('host', 'mqtt.carbonfay.ru');
        $window.localStorage.setItem('port', '80');
        $window.localStorage.setItem('user', 'wb_008641ccdc3d');
        $window.localStorage.setItem('password', '111111111');
        $window.localStorage.setItem('prefix', 'true');
        $window.location.reload();
      };
    } else {
      if ($window.localStorage['user'] === undefined) {
        $location.path('/settings');
      } else {
        $window.localStorage.removeItem('host');
        $window.localStorage.removeItem('port');
        $window.localStorage.removeItem('user');
        $window.localStorage.removeItem('password');
        $window.localStorage.removeItem('prefix');
        $window.location.reload();
      };
    };
  }
}

export default LoginCtrl;
