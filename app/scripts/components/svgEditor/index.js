'use strict';

import svgEditorComponent from './svgEditor.component';
import svgUploadComponent from './upload/svgUpload.component';
import svgFormComponent from './form/svgForm.component';

import inputFileDirective from './directives/inputFile.directive';
import validateIdDirective from './directives/validateId.directive';

import './svgEditor.scss';

export default angular
    .module('HomeuiApp.svgEditor', [])
    .config(['$translateProvider', '$translatePartialLoaderProvider', function($translateProvider, $translatePartialLoaderProvider) {
        $translatePartialLoaderProvider.addPart('svg');
    }])
    .component('svgEditor', svgEditorComponent)
    .component('svgUpload', svgUploadComponent)
    .component('svgForm', svgFormComponent)
    .directive('inputFile', inputFileDirective)
    .directive('validateId', validateIdDirective)
    .name;