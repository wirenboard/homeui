import template from './loginForm.html';
import controller from './loginForm.controller';

const loginFormComponent = {
  restrict: 'E',
  bindings: {
    url: '<',
  },
  template,
  controller,
};

export default loginFormComponent;
