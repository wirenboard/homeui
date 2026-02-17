'use strict';

// Modules
const fs = require('fs');
const dotenv  = require('dotenv');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

const path = require('path');

dotenv.config({ path: '.env.default' });

if (fs.existsSync('.env')) {
  dotenv.config({ path: '.env', override: true });
}

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
    new webpack.DefinePlugin({
      __IS_PROD__: JSON.stringify(isProd),
      __DISABLE_HTTPS_CHECK__: process.env.DISABLE_HTTPS_CHECK === 'true',
      __APP_NAME__: JSON.stringify(process.env.APP_NAME),
      __APP_SHORT_NAME__: JSON.stringify(process.env.APP_SHORT_NAME),
      __LOGO__: JSON.stringify(process.env.LOGO),
      __LOGO_COMPACT__: JSON.stringify(process.env.LOGO_COMPACT),
      __HIDE_COMPACT_MENU__: process.env.HIDE_COMPACT_MENU === 'true',
    }),
    new HtmlWebpackPlugin({
      filename: './index.html',
      template: './index.ejs',
      templateParameters: {
        APP_NAME: process.env.APP_NAME,
      },
      chunksSortMode: function (a, b) {
        var order = ['polyfills', 'commons', 'libs', 'js', 'vendor', 'main'];
        return order.indexOf(a) - order.indexOf(b);
      },
      inject: 'body',
      minify: false,

      // Options passed to template
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
        exclude: /node_modules/,
        use: [
          {
            loader: 'thread-loader',
            options: {
              workers: 2,
            },
          },
          {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true,
            },
          },
        ],
      },
      {
        test: /\.(ts|tsx)$/,
        exclude: [/node_modules/],
        use: [
          {
            loader: 'esbuild-loader',
            options: {
              jsx: 'automatic',
            }
          }
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
        test: /\.(woff|woff2|ttf|eot)$/,
        type: 'asset/resource',
        generator: {
          filename: '[name][ext]',
        },
      },
      {
        test: /\.svg$/,
        use: [{ loader: '@svgr/webpack', options: { typescript: true, titleProp: true }}],
      },
      {
        test: /\.html$/,
        type: 'asset/source',
      },
    ],
  };

  config.resolve = {
    extensions: ['*', '.js', '.jsx', '.ts', '.tsx'],
    alias: {
      'paho-mqtt': path.resolve(__dirname, 'node_modules/paho-mqtt/paho-mqtt.js'),
      '~': path.resolve(__dirname, 'app/scripts/'),
      '@': path.resolve(__dirname, 'src/'),
    },
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
        'paho-mqtt',
        'bootstrap',
        'angular-touch',
        'angular-sanitize',
        './3rdparty/ui-bootstrap',
        'spectrum-colorpicker',
        'angular-spectrum-colorpicker',
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
          test: /[\\/]node_modules[\\/](react|react-dom|react-select|mobx|mobx-react-lite|react-tabs|react-focus-lock|react-responsive|react-responsive-carousel)[\\/]/,
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
      test: /\.css$/i,
      use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader'],
    });
  } else {
    // Development settings

    config.mode = 'development';
    config.cache = true;

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
      test: /\.css$/i,
      use: ['style-loader', 'css-loader', 'postcss-loader'],
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
    liveReload: false,
    client: {
      overlay: true,
      progress: true,
      reconnect: true,
    },
    proxy: [
      {
        context: [
          '/auth/check_config',
          '/auth/users',
          '/auth/login',
          '/auth/who_am_i',
          '/auth/logout',
          '/mqtt',
          '/device/info',
          '/api/https/request_cert',
          '/api/https',
          '/api/check',
          '/api/integrations/alice',
          '/ui/menu'
        ],
        target: process.env.MQTT_BROKER_URI,
        ws: true,
      },
      {
        context: ['/api/integrations'],
        target: `${process.env.MQTT_BROKER_URI}:8011`,
        pathRewrite: { '^/api': '' },
      },
    ],
  };

  return config;
})();
