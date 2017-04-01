// This file is an entry point for angular tests
// Avoids some weird issues when using webpack + angular.

import 'angular';
import 'angular-mocks/angular-mocks';
import 'jquery';
import 'bootstrap';
import '../app/lib/mqttws31';
import '../app/3rdparty/angular-json-editor';
import '../app/3rdparty/jsoneditor';
import '../app/3rdparty/ui-bootstrap';
import 'spectrum-colorpicker';
import '../app/lib/angular-spectrum-colorpicker/dist/angular-spectrum-colorpicker';
import 'angular-resource';
import 'angular-sanitize';
import 'angular-touch';
import 'ui-select';
import 'angular-elastic/elastic';
import 'angular-xeditable/dist/js/xeditable';
import 'ng-file-upload';
import 'angular-sortable-view/src/angular-sortable-view';
import 'oclazyload';
import '../app/lib/angular-order-object-by/src/ng-order-object-by';
import '../app/lib/angular-toggle-switch/angular-toggle-switch';
import 'jquery-simulate-ext/libs/jquery.simulate';

var testsContext = require.context('./unit/views', true, /scripts\.spec\.js$/);

testsContext.keys().forEach(testsContext);

