class AlertCtrl {
  constructor($scope, $timeout, AlertDelayMs, rolesFactory) {
    'ngInject';

    var oldTimeout = null;

    $scope.visible = false;
    $scope.messageHtml = "";
    $scope.$on("$locationChangeSuccess", function () {
      $scope.visible = false;
    });
    $scope.$on("alert", function (ev, message, sticky) {
      if (oldTimeout !== null) {
        $timeout.cancel(oldTimeout);
        oldTimeout = null;
      }
      if (!message) {
        $scope.visible = false;
        return;
      }
      $scope.visible = true;
      $scope.messageHtml = $("<div/>").text(message).html().replace(/\n/g, "<br>");
      if (!sticky) {
        oldTimeout = $timeout(function () {
          oldTimeout = null;
          $scope.visible = false;
        }, AlertDelayMs);
      }
    });

    $scope.stableNotice = !localStorage.getItem('hide-stable-notice') && (rolesFactory.current.role == rolesFactory.ROLE_THREE)
    $scope.closeStableNotice = function() {
      $scope.stableNotice = false;
      localStorage.setItem('hide-stable-notice', true);
    };

    $scope.bullseyeNotice = !localStorage.getItem('hide-bullseye-notice') && (rolesFactory.current.role == rolesFactory.ROLE_THREE)
    $scope.closeBullseyeNotice = function() {
      $scope.bullseyeNotice = false;
      localStorage.setItem('hide-bullseye-notice', true);
    };

  }
}

export default AlertCtrl;
