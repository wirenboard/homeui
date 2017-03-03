import 'bootstrap/dist/css/bootstrap.css';
import controller from './loginForm.controller';
import template from './loginForm.html'

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
