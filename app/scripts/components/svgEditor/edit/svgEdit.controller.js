import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/javascript/javascript';

class SvgEditController {

    constructor($scope, $sce, DeviceData, $element) {
        'ngInject';

        this.$scope = $scope;
        this.$element = $element;
        this.$sce = $sce;
        this.deviceData = DeviceData;

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

        $scope.$watch('$viewContentLoaded', () => { 
            this.$scope.$watch('$ctrl.getSvgElement()', () => {
                var elm = this.getSvgElement();
                if (elm) {
                    angular.element(elm).attr('style', '');
                }
            });
           this.ready();
        });
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

    isContent() {
        return this.dashboard.content.svg.current.length;
    }

    svg() {
        return this.$sce.trustAsHtml(this.dashboard.content.svg.current);
    }

    getDevices() {
        var tmp = [];
        for (var key in this.deviceData.cells) {
            var c = this.deviceData.cells[key];
            var d = this.deviceData.devices[c.deviceId];
            let cell = {
                id: c.id,
                name: c.name,
                device: d.name
            };
            tmp.push(cell);
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

    clear() {
        angular.element(this.editable).removeClass('selected');
        this.editable = null;
        this.editableParam = null;
        this.editableType = null;
    }

    save() {
        if (this.editable && this.editableParam) {
            var svgId = this.editable.getAttribute(this.attributeIdName);
            var obj = JSON.parse(JSON.stringify(this.editableParam));
            this.dashboard.setSvgParam(svgId, obj);

            this.cancel();

            this.saveSVG();
        }
    }

    saveSVG() {
        var svg = document.getElementsByTagName('svg')[0].outerHTML;
        this.dashboard.content.svg.current = svg;   
    }

    cancel() {
        if (this.editable) {
            this.clear();
        }
    }

    remove(msg) {
        if (window.confirm(msg)) {
            if (this.editable && this.editableParam) {
                var svgId = this.editable.getAttribute(this.attributeIdName);
    
                this.dashboard.deleteSvgParam(svgId);
    
                if (this.editable.hasAttribute(this.attributeIdName)) {
                    this.editable.removeAttribute(this.attributeIdName);
                }
            }

            this.cancel();

            this.saveSVG();
        }
    }

    enableEditJsonMode () {
        this.jsonSource = angular.toJson(this.dashboard.content.svg.params, true);
        this.editJsonMode = true;
    }

    disableEditJsonMode () {
        this.editJsonMode = false;
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

    getSvgElement() {
        return this.$element[0].querySelector('svg');
    }

}

export default SvgEditController;
