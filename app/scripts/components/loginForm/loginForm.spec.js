import loginFormModule from './components/loginForm';

describe('loginForm', () => {

  describe('LoginFormCtrl', () => {
    let ctrl;

    beforeEach(() => {
      angular.mock.module(loginFormModule);

      angular.mock.inject(($controller) => {
        ctrl = $controller('LoginFormCtrl', {});
      });
    });

    it('Login form dumb test', () => {
      expect(0).toBe(0);
    });
  });
});