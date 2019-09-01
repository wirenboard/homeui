class SvgUploadController {

    constructor($scope) {
        'ngInject';

        this.$scope = $scope;
        this.states = {
            STATE_NEW: 0,
            STATE_PROCESS: 1,
            STATE_LOADED: 2
        };
        
        this.state = this.states.STATE_NEW;

        this.downloadUrl = null;
        this.downloadName = null;
        
        $scope.$watch('$viewContentLoaded', () => { 
            if (this.dashboard && this.dashboard.content.svg.current.length) {
                this.state = this.states.STATE_LOADED;

                var blob = new Blob([this.dashboard.content.svg.current], { type : 'image/svg+xml' });
                this.downloadUrl = (window.URL || window.webkitURL).createObjectURL(blob);
                this.downloadName = this.dashboard.name + '.svg';
            }
         });
        
        this.isSelect = false;
    }

    loadFile() {
        if (!this.$scope.file) {
            return;
        }

        this.state = this.states.STATE_PROCESS;

        var vm = this;
        var reader = new FileReader();
        reader.onload = function(e) {
            vm.loadFileCompleted(reader.result);
        };

        reader.readAsText(this.$scope.file);
    }

    loadFileCompleted(result) {
        this.state = this.states.STATE_LOADED;
        this.isSelect = false;

        this.dashboard.content.svg.original = result;
        this.dashboard.content.svg.current = result;

        var fileElement = angular.element('input[type="file"]');
        angular.element(fileElement).val(null);
    }

    isStateNew() {
        return this.state === this.states.STATE_NEW;
    }

    isStateProcess() {
        return this.state === this.states.STATE_PROCESS;
    }

    isStateLoaded() {
        return this.state === this.states.STATE_LOADED;
    }

    isDisabled() {
        return !this.isSelect || this.isStateProcess();
    }

    onSelect() {
        this.isSelect = true;
    }
}

export default SvgUploadController;
