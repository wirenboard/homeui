import loginFormComponent from './loginForm.component';

const LoginFormModule = angular
  .module('HomeuiApp.loginForm', [])
  .component('loginForm', loginFormComponent)
  .config([
    '$translatePartialLoaderProvider',
    function ($translatePartialLoaderProvider) {
      $translatePartialLoaderProvider.addPart('login');
    },
  ]).name;

export default LoginFormModule;
