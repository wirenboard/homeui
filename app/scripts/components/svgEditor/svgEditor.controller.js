import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/javascript/javascript';

class SvgEditorController {
    
    constructor ($scope, $location, uiConfig, $sce, $element, DeviceData, $locale, $timeout) {
        'ngInject';

        this.$scope = $scope;
        this.$location = $location;
        this.uiConfig = uiConfig;
        this.$sce = $sce;
        this.$element = $element;
        this.deviceData = DeviceData;
        this.$locale = $locale;

        this.editable = null;
        this.editableParam = null;
        this.editableType = null;

        this.devices = [];

        this.allowedNodes = [
            'path',
            'circle',
            'text'
        ];
        
        this.attributeIdName = 'data-svg-param-id';
        
        this.disableEditJsonMode();

        $scope.$watch('$viewContentLoaded', () => { 
            this.$scope.$watch('$ctrl.getSvgElement()', () => {
                var elm = this.getSvgElement();
                if (elm) {
                    angular.element(elm).attr('style', '');
                }
                $timeout(() => this.ready(),0);
            });
        });
    }

    svg() {
        return this.$sce.trustAsHtml(this.dashboard.content.svg.current);
    }

    hasContent() {
        return this.dashboard?.content?.svg?.current?.length;
    }

    disableEditJsonMode () {
        this.editJsonMode = false;
    }

    enableEditJsonMode () {
        this.jsonSource = angular.toJson(this.dashboard.content.svg.params, true);
        this.editJsonMode = true;
    }

    updateSourceFromJson () {
        let newSource = null;
        try {
            newSource = angular.fromJson(this.jsonSource);
        } catch (e) {
            alert(e);
            return;
        }
        if (!newSource) { return; }

        this.dashboard.content.svg.params = angular.copy(newSource);

        this.disableEditJsonMode();
    }

    ready() {
        this.devices = this.getDevices();
        this.bindClick();
    }

    bindClick() {
        window.onclick = e => {
            e = e || window.event;
            var target = e.target || e.srcElement;

            var editable = this.findElement(target);
            if (editable) {
                if (this.editable) {
                    angular.element(this.editable).removeClass('selected');
                }
                this.editable = editable;
                this.editableType = editable.tagName;
                
                angular.element(this.editable).addClass('selected');

                if (!this.editable.hasAttribute(this.attributeIdName)) {
                    const uuid = `f${(+new Date()).toString(16)}`;
                    this.editable.setAttribute(this.attributeIdName, uuid);
                }

                var param = this.dashboard.getSvgParam(this.editable.getAttribute(this.attributeIdName));
                this.editableParam = angular.copy(param);

                this.$scope.$apply();
            }
        };
    }

    getDevices() {
        var tmp = [];
        let i = 0;
        for (var key in this.deviceData.cells) {
            ++i;
            var c = this.deviceData.cells[key];
            if (c.isComplete()) {
                var d = this.deviceData.devices[c.deviceId];
                if (d !== undefined) {
                    let cell = {
                        id: c.id,
                        name: c.getName(this.$locale.id),
                        device: d.getName(this.$locale.id)
                    };
                    tmp.push(cell);
                }
            }
        }
        return tmp;
    }

    findElement(target) {
        var elm = null;
        this.allowedNodes.forEach((v) => {
            if (elm) {
                return false;
            }

            if (target.nodeName === v) {
                elm = target;
                return false;
            }

            var el = target.closest(v);
            if (el) {
                elm = el;
            }

        });
        return elm;
    }

    getSvgElement() {
        return this.$element[0].querySelector('svg');
    }

    saveEditable() {
        if (this.editable && this.editableParam) {
            var svgId = this.editable.getAttribute(this.attributeIdName);
            var obj = JSON.parse(JSON.stringify(this.editableParam));
            this.dashboard.setSvgParam(svgId, obj);

            this.cancelEditingEditable();

            this.saveSVG();
        }
    }

    canSaveEditable() {
        return this?.editableParam?.read?.enable || 
               this?.editableParam?.write?.enable ||
               this?.editableParam?.style?.enable ||
               this?.editableParam?.visible?.enable;
    }

    saveSVG() {
        var svg = document.getElementsByTagName('svg')[0].outerHTML;
        this.dashboard.content.svg.current = svg;   
    }

    removeEditable(msg) {
        if (window.confirm(msg)) {
            if (this.editable && this.editableParam) {
                var svgId = this.editable.getAttribute(this.attributeIdName);
    
                this.dashboard.deleteSvgParam(svgId);
    
                if (this.editable.hasAttribute(this.attributeIdName)) {
                    this.editable.removeAttribute(this.attributeIdName);
                }
            }

            this.cancelEditingEditable();

            this.saveSVG();
        }
    }

}

export default SvgEditorController;