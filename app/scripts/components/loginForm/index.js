import loginFormComponent from './loginForm.component';

const LoginFormModule = angular
  .module('HomeuiApp.loginForm', [])
  .component('loginForm', loginFormComponent)
  .config(['$translateProvider', '$translatePartialLoaderProvider', function($translateProvider, $translatePartialLoaderProvider) {
    $translatePartialLoaderProvider.addPart('login');
  }])
  .name;

export default LoginFormModule;
