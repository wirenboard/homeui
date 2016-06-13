// Karma configuration
// http://karma-runner.github.io/0.12/config/configuration-file.html
// Generated on 2015-02-25 using
// generator-karma 0.9.0

module.exports = function(config) {
  'use strict';

  config.set({
    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // base path, that will be used to resolve files and exclude
    basePath: '../',

    // testing framework to use (jasmine/mocha/qunit/...)
    frameworks: ['jasmine'],

    preprocessors: {
      "**/*.html": ["ng-html2js"]
    },

    // list of files / patterns to load in the browser
    files: [
      // bower:js
      'bower_components/jquery/dist/jquery.js',
      'bower_components/angular/angular.js',
      'bower_components/bootstrap/dist/js/bootstrap.js',
      'bower_components/angular-resource/angular-resource.js',
      'bower_components/angular-route/angular-route.js',
      'bower_components/angular-sanitize/angular-sanitize.js',
      'bower_components/angular-touch/angular-touch.js',
      'bower_components/spectrum/spectrum.js',
      'bower_components/angular-spectrum-colorpicker/dist/angular-spectrum-colorpicker.min.js',
      'bower_components/angular-order-object-by/src/ng-order-object-by.js',
      'bower_components/codemirror/lib/codemirror.js',
      'bower_components/angular-ui-codemirror/ui-codemirror.js',
      'bower_components/d3/d3.js',
      'bower_components/c3/c3.js',
      'bower_components/c3-angular/c3-angular.min.js',
      'bower_components/ng-file-upload/ng-file-upload.js',
      'bower_components/angular-toggle-switch-fix-chrome-527709/angular-toggle-switch.js',
      'bower_components/angular-sortable-view/src/angular-sortable-view.js',
      'bower_components/angular-xeditable/dist/js/xeditable.js',
      'bower_components/angular-ui-select/dist/select.js',
      'bower_components/angular-mocks/angular-mocks.js',
      'bower_components/jquery-simulate/jquery.simulate.js',
      // endbower
      'bower_components/codemirror/mode/javascript/javascript.js',
      'node_modules/jasmine-jquery/lib/jasmine-jquery.js',
      'app/scripts/**/*.js',
      'app/scripts/**/*.html',
      'app/views/**/*.html',
      'app/styles/**/*.css',
      'test/mock/**/*.js',
      'test/spec/**/*.js'
    ],

    // list of files / patterns to exclude
    exclude: [
    ],

    // web server port
    port: 8080,

    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera
    // - Safari (only Mac)
    // - PhantomJS
    // - IE (only Windows)
    browsers: [
      'Chrome'
    ],

    // Which plugins to enable
    plugins: [
      'karma-ng-html2js-preprocessor',
      'karma-chrome-launcher',
      'karma-jasmine',
      'karma-emacs-reporter',
      'karma-jasmine-diff-reporter'
    ],

    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: false,

    colors: true,

    // level of logging
    // possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
    logLevel: config.LOG_INFO,

    reporters: [ "jasmine-diff", "dots", "emacs" ],

    ngHtml2JsPreprocessor: {
      stripPrefix: "^([^/]*)/",
      moduleName: "homeuiApp"
    }
    // Uncomment the following lines if you are using grunt's server to run the tests
    // proxies: {
    //   '/': 'http://localhost:9000/'
    // },
    // URL root prevent conflicts with the site root
    // urlRoot: '_karma_'
  });
};
