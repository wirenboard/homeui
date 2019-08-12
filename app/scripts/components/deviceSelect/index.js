'use strict';

import deviceSelectComponent from './deviceSelect.component';
import deviceSelectPickerDirective from './directives/deviceSelectPicker.directive';

import './deviceSelect.scss';

export default angular
    .module('HomeuiApp.deviceSelect', [])
    .config(['$translateProvider', '$translatePartialLoaderProvider', function($translateProvider, $translatePartialLoaderProvider) {
        $translatePartialLoaderProvider.addPart('deviceSelect');
    }])
    .component('deviceSelect', deviceSelectComponent)
    .directive('deviceSelectPicker', deviceSelectPickerDirective)
    .name;