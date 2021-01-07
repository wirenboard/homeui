import loginFormComponent from './loginForm.component';

const LoginFormModule = angular
  .module('HomeuiApp.loginForm', [])
  .component('loginForm', loginFormComponent)
  .name;

export default LoginFormModule;
