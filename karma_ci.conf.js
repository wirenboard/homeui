// Reference: http://karma-runner.github.io/0.12/config/configuration-file.html
module.exports = function karmaConfig (config) {
  config.set({
    basePath: './',

    coverageReporter: {
      dir:'coverage/',
      reporters: [
        { type:'html', subdir: 'report-html' },
        { type:'lcov', subdir: 'report-lcov' }
      ],
      instrumenterOptions: {
        istanbul: { noCompact:true }
      }
    },

    frameworks: [
      // Reference: https://github.com/karma-runner/karma-jasmine
      // Set framework to jasmine
      'jasmine'
    ],

    reporters: [
      // Reference: https://github.com/mlex/karma-spec-reporter
      // Set reporter to print detailed results to console
      'spec',

      // Reference: https://github.com/karma-runner/karma-coverage
      // Output code coverage files
      'coverage'
    ],

    files: [
      'test/tests.webpack.js'
    ],

    preprocessors: {
      // Reference: http://webpack.github.io/docs/testing.html
      // Reference: https://github.com/webpack/karma-webpack
      // Convert files with webpack and load sourcemaps
      'test/tests.webpack.js': ['webpack', 'sourcemap'],
      "**/*.html": ["ng-html2js"]
    },

    browsers: [
      // Run tests using PhantomJS
      'PhantomJS'
    ],

    webpack: require('./webpack.config'),

    // Print webpack build information to console
    webpackMiddleware: {
      noInfo: true
    },

    plugins: [
      'karma-phantomjs-launcher',
      'karma-jasmine',
      'karma-coverage',
      'karma-webpack',
      'karma-spec-reporter',
      'karma-ng-html2js-preprocessor',
      'karma-sourcemap-loader'
    ],

    // Reference: https://github.com/karma-runner/karma-ng-html2js-preprocessor
    ngHtml2JsPreprocessor: {
      stripPrefix: "^([^/]*)",
      moduleName: "homeuiApp"
    },
    
    singleRun: true,
    autoWatch: false,
    logLevel: config.LOG_ERROR,
    concurrency: Infinity,
    port: 9876,
    colors: true,
  });
};
