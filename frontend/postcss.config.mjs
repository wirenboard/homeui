import path from 'path';
import { fileURLToPath } from 'url';
import postcssGlobalData from '@csstools/postcss-global-data';
import autoprefixer from 'autoprefixer';
import postcssCustomMedia from 'postcss-custom-media';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  plugins: [
    postcssGlobalData({
      files: [path.resolve(dirname, 'src/common/breakpoints.css')],
    }),
    postcssCustomMedia(),
    autoprefixer(),
  ],
};
