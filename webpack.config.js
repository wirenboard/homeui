'use strict';

// Modules
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

const path = require('path');

process.traceDeprecation = true;

/**
 * Env
 * Get npm lifecycle event to identify the environment
 */
const ENV = process.env.npm_lifecycle_event;
const isTest = ENV === 'test' || ENV === 'test-watch';
const isProd = ENV === 'build';

module.exports = (function makeWebpackConfig() {
  /**
   * Config
   * Reference: http://webpack.github.io/docs/configuration.html
   * This is the object where all configuration gets set
   */
  var config = {};

  config.context = path.resolve(__dirname, 'app');

  /**
   * Plugins
   * Reference: http://webpack.github.io/docs/configuration.html#plugins
   * List: http://webpack.github.io/docs/list-of-plugins.html
   */
  config.plugins = [
    /**
     * Provide plugin
     * Reference: https://webpack.js.org/plugins/provide-plugin/#root
     *
     */
    new webpack.ProvidePlugin({
      jQuery: 'jquery',
      $: 'jquery',
      'window.jQuery': 'jquery',
      'window.DOMPurify': 'dompurify',
    }),
  ];

  /**
   * Loaders
   * Reference: http://webpack.github.io/docs/configuration.html#module-loaders
   * List: http://webpack.github.io/docs/list-of-loaders.html
   * This handles most of the magic responsible for converting modules
   */

  // Initialize module
  config.module = {
    rules: [
      {
        test: require.resolve('angular'),
        loader: 'exports-loader',
        options: {
          exports: 'single window.angular',
          type: 'commonjs',
        },
      },
      {
        // JS LOADER
        // Reference: https://github.com/babel/babel-loader
        // Transpile .js and .jsx files using babel-loader
        // Compiles ES6 and ES7 into supported by target browsers code
        test: /\.(js|jsx)$/,
        include: [path.resolve(__dirname, 'app', 'scripts'), path.resolve(__dirname, 'app', 'lib')],
        exclude: /(node_modules|bower_components)/,
        use: [
          {
            loader: 'babel-loader',
          },
        ],
      },
      // ASSET LOADER
      // Reference: https://webpack.js.org/guides/asset-modules/
      {
        test: /\.(png|jpg|jpeg|gif)$/,
        type: 'asset/resource',
      },
      {
        // without hash
        test: /\.(svg|woff|woff2|ttf|eot)$/,
        type: 'asset/resource',
        generator: {
          filename: '[name][ext]',
        },
      },
      {
        test: /\.html$/,
        type: 'asset/source',
      },
    ],
  };

  config.resolve = {
    extensions: ['*', '.js', '.jsx'],
  };

  /**
   * Entry
   * Reference: http://webpack.github.io/docs/configuration.html#entry
   */
  config.entry = {
    main: {
      import: [
        'angular',
        'oclazyload',
        'jquery',
        './lib/mqttws31',
        'bootstrap',
        'angular-touch',
        'angular-sanitize',
        './3rdparty/ui-bootstrap',
        'spectrum-colorpicker',
        './lib/angular-spectrum-colorpicker/dist/angular-spectrum-colorpicker',
        'ui-select',
        'angular-elastic/elastic',
        'angular-xeditable',
        'angular-sortable-view/src/angular-sortable-view',
        'angular-rangeslider',
        'ng-toast',

        'angular-translate',
        'angular-translate-loader-partial',
        'angular-spinkit',
        'angular-ui-scroll',
        'angular-dynamic-locale',
        'angularjs-dropdown-multiselect',
        'dompurify',

        // Taken from  https://github.com/angular/angular.js/tree/master/src/ngLocale
        './scripts/i18n/angular-locale_en.js',
        './scripts/i18n/angular-locale_ru.js',
        './scripts/app.js',
      ],
    },
  };

  // Reference: https://webpack.js.org/plugins/split-chunks-plugin/
  config.optimization = {
    splitChunks: {
      chunks: 'all',
      minChunks: 1,
      cacheGroups: {
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-select|mobx|mobx-react-lite|mobx-utils|react-tabs|react-focus-lock|react-responsive|react-responsive-carousel)[\\/]/,
          name: 'react',
          chunks: 'all',
        },
        plotly: {
          test: /[\\/]node_modules[\\/]plotly\.js-basic-dist-min[\\/]/,
          name: 'plotly',
          chunks: 'all',
        },
        codemirror: {
          test: /[\\/]node_modules[\\/](@codemirror|@uiw)[\\/]/,
          name: 'codemirror',
          chunks: 'all',
        },
        jsoneditor: {
          test: /[\\/]app[\\/]3rdparty[\\/]jsoneditor.js/,
          name: 'jsoneditor',
          chunks: 'all',
        },
      },
    },
  };

  config.plugins.push(
    // Reference: https://github.com/ampedandwired/html-webpack-plugin
    // Render index.html
    new HtmlWebpackPlugin({
      filename: './index.html',
      template: './index.ejs',
      chunksSortMode: function (a, b) {
        var order = ['polyfills', 'commons', 'libs', 'js', 'vendor', 'main'];
        return order.indexOf(a) - order.indexOf(b);
      },
      inject: 'body',
      minify: false,

      // Options passed to template

      // Set to true when building for stable release
      stableRelease: false,
    })
  );

  // Production specific settings
  if (isProd) {
    console.log('Production build');

    config.mode = 'production';

    /**
     * Output
     * Reference: https://webpack.js.org/concepts/#output
     */
    config.output = {
      // Absolute output directory
      path: path.resolve(__dirname, 'dist'),

      // Output path from the view of the page
      publicPath: '/',

      // Filename for entry points
      filename: '[name].[chunkhash].js',

      // Filename for non-entry points
      chunkFilename: '[name].[chunkhash].js',
    };

    config.devtool = 'nosources-source-map';

    config.optimization['minimize'] = true;
    config.optimization['minimizer'] = [
      '...',
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
            },
          ],
        },
      }),
    ];

    config.plugins.push(
      // Copy assets from the public folder
      // Reference: https://github.com/kevlened/copy-webpack-plugin
      new CopyWebpackPlugin({
        patterns: [
          { from: path.join(__dirname, 'app', 'images'), to: 'images' },
          { from: path.join(__dirname, 'app', '404.html'), to: '404.html' },
          { from: path.join(__dirname, 'app', 'favicon.ico'), to: 'favicon.ico' },
          { from: path.join(__dirname, 'app', 'robots.txt'), to: 'robots.txt' },
          { from: path.join(__dirname, 'app', 'scripts/i18n'), to: 'scripts/i18n' },
        ],
      }),
      // Reference: https://github.com/webpack-contrib/mini-css-extract-plugin
      // Extract CSS files from JS
      new MiniCssExtractPlugin({ filename: 'css/[name].[contenthash].css' })
    );

    // Load styles
    config.module.rules.push({
      test: /\.(sa|sc|c)ss$/i,
      use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader', 'sass-loader'],
    });
  } else {
    // Development settings

    config.mode = 'development';

    config.output = {
      // Absolute output directory
      path: path.resolve(__dirname, 'dist'),

      // Output path from the view of the page
      // Uses dev-server in development
      publicPath: 'http://localhost:8080/',

      // Filename for entry points
      filename: '[name].bundle.js',

      // Filename for non-entry points
      chunkFilename: '[name].bundle.js',
    };

    config.devtool = 'eval-source-map';

    // Load styles
    config.module.rules.push({
      test: /\.(sa|sc|c)ss$/i,
      use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader', 'sass-loader'],
    });

    config.plugins.push(
      // Extract CSS files from JS
      new MiniCssExtractPlugin({ filename: 'css/[name].css' })
    );
  }

  /**
   * Dev server configuration
   * Reference: https://webpack.js.org/configuration/dev-server/#devserver
   */
  config.devServer = {
    static: {
      directory: path.join(__dirname, 'app'),
    },
    port: 8080,
    hot: true,
  };

  return config;
})();
