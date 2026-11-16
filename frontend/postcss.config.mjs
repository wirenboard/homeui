const path = require('path');

module.exports = {
  plugins: [
    require('@csstools/postcss-global-data')({
      files: [path.resolve(__dirname, 'src/common/breakpoints.css')],
    }),
    require('postcss-custom-media'),
    require('autoprefixer'),
  ],
};
