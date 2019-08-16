'use strict';

import channelSelectComponent from './channelSelect.component';
import channelSelectPickerDirective from './directives/channelSelectPicker.directive';

import './channelSelect.scss';

export default angular
    .module('HomeuiApp.channelSelect', [])
    .config(['$translateProvider', '$translatePartialLoaderProvider', function($translateProvider, $translatePartialLoaderProvider) {
        $translatePartialLoaderProvider.addPart('channelSelect');
    }])
    .component('channelSelect', channelSelectComponent)
    .directive('channelSelectPicker', channelSelectPickerDirective)
    .name;