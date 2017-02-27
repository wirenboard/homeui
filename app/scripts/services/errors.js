// Loosely based on
// http://odetocode.com/blogs/scott/archive/2014/04/21/better-error-handling-in-angularjs.aspx

function errorsService($rootScope) {
  function showError (message, reason) {
    $rootScope.$broadcast("alert", message + ": " + ((reason && reason.message) || reason), true);
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
