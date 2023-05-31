'use strict';

class DashboardSvgEditController {
    constructor($scope, uiConfig, $stateParams, rolesFactory, mqttClient, $location) {
        'ngInject';
        
        $scope.roles = rolesFactory;
        this.$location = $location;

        var vm = this;
    
        function getDashboard() {
            if ($stateParams.id) {
                return uiConfig.getDashboard($stateParams.id);
            }
            return uiConfig.addDashboardWithSvg();
        }
    
        mqttClient.whenReady()
            .then(() => uiConfig.whenReady())
            .then(() => {
                vm.dashboard = getDashboard();
            });
    }

    cancelSavingDashboard() {
        if (this.dashboard.isNew) {
            this.dashboard.remove();
        }
        this.backToDashboardsList();
    }

    removeDashboard(msg) {
        if (window.confirm(msg)) {
            this.dashboard.remove();
            this.backToDashboardsList();
        }
    }

    backToDashboardsList() {
        this.$location.path('dashboards');
    }

    canSaveDashboard() {
        return this?.dashboard?.content?.svg?.current?.length;
    }

    isValidDashboard() {
        return this?.dashboard?.id && this?.dashboard?.name && this?.dashboard?.content?.svg?.current && this?.dashboard?.content?.svg?.current?.length;
    }

    saveDashboard() {
        this.dashboard.content.svg_url = 'local';
        this.dashboard.content.isSvg = true;

        if (this.dashboard.isNew) {
            delete this.dashboard.content.isNew;
        }

        this.backToDashboardsList();
    }
}

export default angular
    .module('homeuiApp.dashboard-svg-edit', [])
    .controller('DashboardSvgEditCtrl', DashboardSvgEditController);
