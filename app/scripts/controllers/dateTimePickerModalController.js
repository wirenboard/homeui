class DateTimePickerModalCtrl {
  constructor($uibModalInstance) {
    'ngInject';
    var $ctrl = this;

    $ctrl.startDate = new Date();
    $ctrl.startTime = $ctrl.startDate;
    $ctrl.startTime.setSeconds(0);
    $ctrl.startTime.setMilliseconds(0);

    $ctrl.ok = function () {
      $ctrl.startDate.setHours($ctrl.startTime.getHours());
      $ctrl.startDate.setMinutes($ctrl.startTime.getMinutes());
      $ctrl.startDate.setSeconds($ctrl.startTime.getSeconds());
      $uibModalInstance.close($ctrl.startDate);
    };

    $ctrl.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };
  }
}

//-----------------------------------------------------------------------------
export default DateTimePickerModalCtrl;
