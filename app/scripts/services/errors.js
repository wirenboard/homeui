// Loosely based on
// http://odetocode.com/blogs/scott/archive/2014/04/21/better-error-handling-in-angularjs.aspx

function errorsService($rootScope) {
  'ngInject';
  
  function showError (message, reason) {
    if (reason) {
      message = message + ": "
      if (reason.message) {
        message = message + reason.message + (reason.data && (" " + reason.data))
      } else {
        message = message + reason
      }
    }
    $rootScope.$broadcast("alert", message, true);
  }

  return {
    showError: showError,
    hideError: () => {
      $rootScope.$broadcast("alert", "");
    },
    catch: message => reason => {
      showError(message, reason);
    }
  };
}

export default errorsService;
