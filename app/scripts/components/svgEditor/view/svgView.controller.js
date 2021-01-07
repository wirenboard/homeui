class SvgViewController {

    constructor($scope, $element, $compile, $sce, DeviceData) {
        'ngInject';

        this.$scope = $scope;
        this.$scope.devicedata = DeviceData;

        this.$element = $element;
        this.$compile = $compile;
        this.$sce = $sce;

        this.deviceData = DeviceData;

        this.svg = null;
        this.elementSvg = null;

        this.attributeIdName = 'data-svg-param-id';

        $scope.$watch('$viewContentLoaded', () => { 
            this.ready();
        });
    }

    ready() {
        this.svg = this.$sce.trustAsHtml(this.dashboard.content.svg.current);
        
        this.$scope.$watch('$ctrl.getSvgElement()', () => {
            var elm = this.getSvgElement();
            if (elm) {
                this.elementSvg = elm;
                this.parse();
            }
        });
    }

    parse() {
        this.applyFullwidth();

        var regions = this.$element[0].querySelectorAll('*');
        angular.forEach(regions, (path, key) => {
            var element = angular.element(path);
            if (element[0].hasAttribute(this.attributeIdName)) {
                var paramId = element[0].getAttribute(this.attributeIdName);
                var param = this.dashboard.getSvgParam(paramId);
                if (param) {
                    if (param.read.enable) {
                        this.appendRead(element, param.read);
                    }
                    if (param.write.enable) {
                        this.appendWrite(element, param.write);
                    }
                    if (param.visible.enable) {
                        this.appendVisible(element, param.visible);
                    }
                    if (param.style.enable) {
                        this.appendStyle(element, param.style);
                    }

                    this.$compile(element)(this.$scope);
                }
            }
        });
            
    }

    appendRead(element, param) {
        var tspan = element[0].querySelector('tspan');
        if (tspan !== null) {
            var val = '{{' + param.value + '}}';
            tspan.innerHTML = val;

            var $tspan = angular.element(tspan);
            $tspan.attr('svg-view-element', '');
            $tspan.attr('ng-cloak', '');

            this.appendChannelData($tspan, param);
        }
    }

    appendWrite(element, param) {
        element[0].classList.add('switch');
        element[0].addEventListener('click', (e) => {
            var cell = this.deviceData.cell(param.channel);
            cell.value = (cell.value == param.value.on) ? param.value.off : param.value.on;
        });
    }

    appendVisible(element, param) {
        var val = 'val' + param.condition + param.value + '';
        element.attr('ng-show', val);

        element.attr('svg-view-element', '');
        element.attr('ng-cloak', '');
        
        this.appendChannelData(element, param);
    }

    appendStyle(element, param) {
        var val = '{{' + param.value + '}}';
        var style = element.attr('style') + ';' + val;
        element.attr('style', style);

        element.attr('svg-view-element', '');
        element.attr('ng-cloak', '');

        this.appendChannelData(element, param);
    }

    appendChannelData(element, param) {
        var channel = param.channel;
        var channelData = `devicedata.proxy('${channel}')`;

        element.attr('val', channelData + '.value');
        element.attr('type', channelData + '.metaType');
        element.attr('units', channelData + '.metaUnits');
        element.attr('error', channelData + '.metaError');
        element.attr('device', channel);
    }

    applyFullwidth() {
        if (!this.dashboard.svgFullWidth) {
            return;
        }

        var svgElem = angular.element(this.elementSvg);

        var rW = this.$element.width();
        var rH = this.$element.height();
        var w = svgElem.width();
        var h = svgElem.height();
        var r = rW / w;

        this.$element.attr('height', h * r);

        svgElem.attr('width', w * r);
        svgElem.attr('height', h * r);
    }

    getSvgElement() {
        return this.$element[0].querySelector('svg');
    }

    getElementAttributes(elem) {
        var attr = {};
        if(elem && elem.length) {
            $.each(elem.get(0).attributes, function(v,n) {
                n = n.nodeName||n.name;
                v = elem.attr(n);
                if(v !== undefined && v !== false) {
                    attr[n] = v;
                }
            });
        }

        return attr;
    }

    parseAttrs(attrStr) {
        var el = {};
        try {
            el = angular.element('<div ' + attrStr + ' />');
        } catch (err) {}
        return this._etElementAttributes(el);

    }

    getDirectChild(element, nodeName) {
        for (var i = 0; i < element.children.length; i++) {
            var child = element.children[i];
            if (child.nodeName === nodeName) {
                return child;
            }
        }
        return null;
    }
}

export default SvgViewController;
