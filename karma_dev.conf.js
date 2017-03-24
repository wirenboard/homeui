// Reference: http://karma-runner.github.io/0.12/config/configuration-file.html
module.exports = function karmaConfig (config) {
  config.set({
    basePath: './',

    coverageReporter: {
      dir:'coverage/',
      reporters: [
        { type:'html', subdir: 'report-html' },
        { type:'lcov', subdir: 'report-lcov' }
      ]
      // instrumenterOptions: {
      //   istanbul: { noCompact:true }
      // }
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
      'test/tests.webpack.js': ['webpack']
    },

    browsers: [
      // Run tests using Chrome
      'Chromium'
    ],

    webpack: require('./webpack.config'),

    // Hide webpack build information from output
    webpackMiddleware: {
      noInfo: false
    },

    plugins: [
      'karma-chrome-launcher',
      'karma-jasmine',
      'karma-coverage',
      'karma-webpack',
      'karma-spec-reporter'
    ],

    logLevel: config.LOG_INFO,
    concurrency: Infinity,
    port: 9876,
    colors: true
  });
};
