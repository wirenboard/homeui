// Loosely based on
// http://odetocode.com/blogs/scott/archive/2014/04/21/better-error-handling-in-angularjs.aspx

function errorsService($rootScope, $translate) {
  'ngInject';

  function makeErrorMessage(message, reason) {
    if (reason) {
      message = message + ': ';
      if (reason.message) {
        message = message + reason.message + (reason.data && ' ' + reason.data);
      } else {
        message = message + reason;
      }
    }
    return message;
  }

  function raiseError(message) {
    $rootScope.$broadcast('alert', message, true);
  }

  // error could be string or {msg:..., data:...} object for passing to $translate
  function getTranslationPromise(error) {
    return $translate(error.msg ? error.msg : error, error.data);
  }

  // msg could be string or {msg:..., data:...} object for passing to $translate
  function showError(msg, reason) {
    getTranslationPromise(msg)
      .then(message => raiseError(makeErrorMessage(message, reason)))
      .catch(message => raiseError(makeErrorMessage(message, reason)));
  }

  // Array of errors. Error could be string or {msg:..., data:...} object for passing to $translate
  function showErrors(errors) {
    Promise.allSettled(errors.map(error => getTranslationPromise(error))).then(translations => {
      const message = translations
        .map((tr, index) => {
          return makeErrorMessage(
            tr.status == 'fulfilled' ? tr.value : tr.reason,
            errors[index].reason
          );
        })
        .join('\n\t');
      if (message.length) {
        raiseError(message);
      }
    });
  }

  return {
    showError: showError,
    showErrors: showErrors,
    hideError: () => {
      $rootScope.$broadcast('alert', '');
    },
    catch: message => reason => {
      showError(message, reason);
    },
  };
}

export default errorsService;
