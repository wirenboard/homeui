function pageStateService(
  $rootScope,
  $window,
  forceBeforeUnloadConfirmationForTests,
  $translate,
  $transitions
) {
  'ngInject';

  var dirty = false;
  var CONFIRMATION_MSG;

  var updateTranslations = () => {
    $translate('app.prompt.dirty').then(translation => {
      CONFIRMATION_MSG = translation;
    });
  };
  updateTranslations();
  $rootScope.$on('$translateChangeSuccess', () => updateTranslations());

  $transitions.onBefore({}, function (transition) {
    const serialConfigStates = ['serial-config.properties', 'serial-config.scan', 'serial-config'];
    if (
      serialConfigStates.includes(transition.from().name) &&
      serialConfigStates.includes(transition.to().name)
    ) {
      return true;
    }
    if (!dirty) {
      return true;
    }
    if ($window.confirm(CONFIRMATION_MSG)) {
      dirty = false;
      return true;
    }
    return false;
  });

  // https://developer.mozilla.org/en-US/docs/Web/Events/beforeunload
  // But don't add the listener during the tests unless explicitly asked to do it
  if (!window.beforeEach || !window.afterEach || forceBeforeUnloadConfirmationForTests) {
    window.addEventListener('beforeunload', e => {
      if (dirty) {
        e.returnValue = CONFIRMATION_MSG; // Gecko and Trident
        return CONFIRMATION_MSG; // Gecko and WebKit
      }

      return undefined;
    });
  }

  return {
    isDirty() {
      return dirty;
    },

    setDirty(isDirty) {
      dirty = !!isDirty;
    },
  };
}

export default pageStateService;
