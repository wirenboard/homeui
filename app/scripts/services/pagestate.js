"use strict";

angular.module("homeuiApp")
  .value("forceBeforeUnloadConfirmationForTests", false)
  .factory("PageState", function ($rootScope, $window, $timeout, $location, forceBeforeUnloadConfirmationForTests) {
    var dirty = false,
        CONFIRMATION_MSG = "The page has unsaved changes. Are you sure you want to leave?";

    $rootScope.$on('$locationChangeStart', function (event, newUrl, oldUrl) {
      if (!dirty)
        return;
      if($window.confirm(CONFIRMATION_MSG))
        dirty = false;
      else
        event.preventDefault();
    });

    // https://developer.mozilla.org/en-US/docs/Web/Events/beforeunload
    // But don't add the listener during the tests unless explicitly asked to do it
    if (!window.beforeEach || !window.afterEach || forceBeforeUnloadConfirmationForTests) {
      window.addEventListener("beforeunload", function (e) {
        if (dirty) {
          e.returnValue = CONFIRMATION_MSG; // Gecko and Trident
          return CONFIRMATION_MSG; // Gecko and WebKit
        }

        return undefined;
      });
    }

    return {
      isDirty: function () {
        return dirty;
      },

      setDirty: function (isDirty) {
        dirty = !!isDirty;
      }
    };
  });
