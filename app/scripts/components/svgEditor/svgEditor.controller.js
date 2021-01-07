class SvgEditorController {
    
    constructor ($scope, $location, uiConfig) {
        'ngInject';

        this.$scope = $scope;
        this.$location = $location;
        this.uiConfig = uiConfig;
    }

    canSave() {
        return this.dashboard.content.svg.current.length;
    }

    isValidate() {
        return this.dashboard.id && this.dashboard.name && this.dashboard.content.svg.current && this.dashboard.content.svg.current.length;
    }

    save() {
        this.dashboard.content.svg_url = 'local';
        this.dashboard.content.isSvg = true;

        if (this.dashboard.isNew) {
            delete this.dashboard.content.isNew;
        }

        this.back();
    }

    cancel() {
        if (this.dashboard.isNew) {
            this.dashboard.remove();
        }
        this.back();
    }

    remove(msg) {
        if (window.confirm(msg)) {
            this.dashboard.remove();
            this.back();
        }
    }

    back() {
        this.$location.path('dashboards');
    }
}

export default SvgEditorController;