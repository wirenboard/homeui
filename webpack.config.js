'use strict';
// Modules
const webpack = require('webpack');
const autoprefixer = require('autoprefixer');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ngAnnotatePlugin = require('ng-annotate-webpack-plugin');
const StatsPlugin = require('stats-webpack-plugin');
const path = require('path')

process.traceDeprecation = true;

/**
 * Env
 * Get npm lifecycle event to identify the environment
 */
const ENV = process.env.npm_lifecycle_event;
const isTest = ENV === 'test' || ENV === 'test-watch';
const isProd = ENV === 'build';

module.exports = function makeWebpackConfig() {
  /**
   * Config
   * Reference: http://webpack.github.io/docs/configuration.html
   * This is the object where all configuration gets set
   */
  var config = {};

  config.context = path.resolve(__dirname, 'app');
  config.node = {
    fs: 'empty'
  }

  /**
   * Entry
   * Reference: http://webpack.github.io/docs/configuration.html#entry
   * Should be an empty object if it's generating a test build
   * Karma will set this when it's a test build
   */
  config.entry = isTest ? void 0 : {
    homeui: './scripts/app.js',
    common: ['angular', 'jquery', 'bootstrap',
      'angular-ui-router', 'angular-touch',
      'ui-select', 'angular-resource', 'angular-sanitize', 'angular-elastic/elastic',
      'angular-xeditable/dist/js/xeditable', 'ng-file-upload', 
      'angular-sortable-view/src/angular-sortable-view', 'oclazyload',
      'codemirror/lib/codemirror',
      './lib/mqttws31',
      './lib/angular-spectrum-colorpicker/dist/angular-spectrum-colorpicker', 'spectrum-colorpicker',
      './lib/angular-order-object-by/src/ng-order-object-by',
      './lib/angular-ui-codemirror/src/ui-codemirror', 'codemirror/mode/javascript/javascript',
      './lib/angular-toggle-switch/angular-toggle-switch',
      './scripts/3rdparty/angular-json-editor', './scripts/3rdparty/jsoneditor', 
      './scripts/3rdparty/ui-bootstrap'

     ]
  };
  /**
   * Output
   * Reference: http://webpack.github.io/docs/configuration.html#output
   * Should be an empty object if it's generating a test build
   * Karma will handle setting it up for you when it's a test build
   */
  config.output = isTest ? {} : {
    // Absolute output directory
    path: path.resolve(__dirname, 'dist'),

    // Output path from the view of the page
    // Uses webpack-dev-server in development
    publicPath: isProd ? '/' : 'http://localhost:8080/',

    // Filename for entry points
    // Only adds hash in build mode
    filename: isProd ? '[name].[hash].js' : '[name].bundle.js',

    // Filename for non-entry points
    // Only adds hash in build mode
    chunkFilename: isProd ? '[name].[hash].js' : '[name].bundle.js'
  };

  /**
   * Devtool
   * Reference: http://webpack.github.io/docs/configuration.html#devtool
   * Type of sourcemap to use per build type
   */
  if (isTest) {
    config.devtool = 'inline-source-map';
  }
  else if (isProd) {
    config.devtool = 'source-map';
  }
  else {
    config.devtool = 'eval-source-map';
  }

  /**
   * Loaders
   * Reference: http://webpack.github.io/docs/configuration.html#module-loaders
   * List: http://webpack.github.io/docs/list-of-loaders.html
   * This handles most of the magic responsible for converting modules
   */

  // Initialize module
  config.module = {
    rules: [{
      test: require.resolve('angular'),
      use: 'exports-loader?window.angular'
    }, {
      // JS LOADER
      // Reference: https://github.com/babel/babel-loader
      // Transpile .js files using babel-loader
      // Compiles ES6 and ES7 into ES5 code
      test: /\.js$/,
      include: path.resolve(__dirname, 'app', 'scripts'),
      exclude: /(node_modules|bower_components)/,
      use: [{
          loader: 'babel-loader',
          options: {
            babelrc: true,
            cacheDirectory: true
          }
        }
      ]
    }, {
      // CSS LOADER
      // Reference: https://github.com/webpack/css-loader
      // Allow loading css through js
      //
      // Reference: https://github.com/postcss/postcss-loader
      // Postprocess your css with PostCSS plugins
      test: /\.css$/,
      // Reference: https://github.com/webpack/extract-text-webpack-plugin
      // Extract css files in production builds
      //
      // Reference: https://github.com/webpack/style-loader
      // Use style-loader in development.

      use: isTest ? 'null-loader' : ExtractTextPlugin.extract({
        fallback: 'style-loader',
        use: [
          {loader: 'css-loader', options: {sourceMap: true}},
          {loader: 'postcss-loader'}
        ]
      })
    }, {
      // ASSET LOADER
      // Reference: https://github.com/webpack/file-loader
      // Copy png, jpg, jpeg, gif, svg, woff, woff2, ttf, eot files to output
      // Rename the file using the asset hash
      // Pass along the updated reference to your code
      // You can add here any file extension you want to get copied to your output
      test: /\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/,
      use: 'file-loader'
    }, {
      test: /\.html$/,
      use: [
        // HTML LOADER
        // Reference: https://github.com/webpack/raw-loader
        // Allow loading html through js
        {loader: 'raw-loader'}
      ]
    }]
  };

  if (isTest) {
    config.module.rules.push({
      enforce: 'pre',
      test: /\.js$/,
      exclude: /node_modules/,
      use: [{loader: 'eslint-loader', options: {rules: {semi: 0}}}],
    });
  }

  /**
   * Plugins
   * Reference: http://webpack.github.io/docs/configuration.html#plugins
   * List: http://webpack.github.io/docs/list-of-plugins.html
   */
  config.plugins = [
    // https://webpack.js.org/guides/code-splitting-libraries/
    new webpack.optimize.CommonsChunkPlugin({
      names: ['common', 'manifest'] // Specify the common bundle's name.
    }),

    /**
    * Angular annotate
    * Reference: 
    * 
    */
    new ngAnnotatePlugin({
      add: true
    }),

    /**
    * PostCSS
    * Reference: https://github.com/postcss/autoprefixer-core
    * Add vendor prefixes to your css
    */
    // NOTE: This is now handled in the `postcss.config.js`
    //       webpack2 has some issues, making the config file necessary
    new webpack.LoaderOptionsPlugin({
      test: /\.scss$/i,
      options: {
        postcss: {
          plugins: [autoprefixer]
        }
      }
    }),
    /**
    * Provide plugin
    * Reference: 
    * 
    */
    new webpack.ProvidePlugin({
      'angular': 'angular',
      jQuery: 'jquery',
      $: 'jquery',
      'window.jQuery': 'jquery'
    })
    // TODO: Add stat plugin
  ];

  // Skip rendering index.html in test mode
  if (!isTest) {
    // Reference: https://github.com/ampedandwired/html-webpack-plugin
    // Render index.html
    config.plugins.push(
      new HtmlWebpackPlugin({
        template: './index.html',
        inject: 'body'
      }),

      // Reference: https://github.com/webpack/extract-text-webpack-plugin
      // Extract css files
      // Disabled when in test mode or not in build mode
      new ExtractTextPlugin({filename: 'css/[name].css', disable: !isProd, allChunks: true})
    )
  }

  // Add build specific plugins
  if (isProd) {
    config.plugins.push(
      // Reference: http://webpack.github.io/docs/list-of-plugins.html#uglifyjsplugin
      // Minify all javascript, switch loaders to minimizing mode
      new webpack.optimize.UglifyJsPlugin({sourceMap: true}),

      // Copy assets from the public folder
      // Reference: https://github.com/kevlened/copy-webpack-plugin
      new CopyWebpackPlugin([
        {from: path.join(__dirname, 'app', 'images'), to: 'images'},
        {from: path.join(__dirname, 'app', 'views'), to: 'views'},
        {from: path.join(__dirname, 'app', '404.html'), to: '404.html'},
        {from: path.join(__dirname, 'app', 'favicon.ico'), to: 'favicon.ico'},
        {from: path.join(__dirname, 'app', 'robots.txt'), to: 'robots.txt'}
      ]),

      // Writes the stats of a build to a file.
      // Reference: https://github.com/unindented/stats-webpack-plugin/
      new StatsPlugin('stats.json', {
        chunkModules: true,
        exclude: [/node_modules/]
      })
    )
  }

  /**
   * Dev server configuration
   * Reference: http://webpack.github.io/docs/configuration.html#devserver
   * Reference: http://webpack.github.io/docs/webpack-dev-server.html
   */
  config.devServer = {
    contentBase: path.join(__dirname, 'app')
  };

  return config;
}();
