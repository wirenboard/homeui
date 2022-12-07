// Loosely based on
// http://odetocode.com/blogs/scott/archive/2014/04/21/better-error-handling-in-angularjs.aspx

function errorsService($rootScope, $translate) {
  'ngInject';

  function raiseError(message, reason) {
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

  // msg could be string or {msg:..., data:...} object for passing to $translate
  function showError (msg, reason) {
    $translate(msg.msg ? msg.msg : msg, msg.data)
      .then(message => raiseError(message, reason))
      .catch(message => raiseError(message, reason));
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
