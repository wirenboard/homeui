import template from './loginForm.html';
import controller from './loginForm.controller';

const loginFormComponent = {
  restrict: 'E',
  bindings: {
    host: '<',
    port: '<'
  },
  template,
  controller
};

export default loginFormComponent;
