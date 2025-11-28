import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import commonjs from 'vite-plugin-commonjs';
import svgr from 'vite-plugin-svgr';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      commonjs(),
      svgr({ include: '**/*.svg' }),
      {
        name: 'inject-scripts',
        transformIndexHtml() {
          return [
            {
              tag: 'script',
              attrs: { src: '/serial.js', async: true },
              injectTo: 'head',
            },
            {
              tag: 'script',
              attrs: { src: '/script.js', async: true },
              injectTo: 'head',
            },
            {
              tag: 'script',
              attrs: { src: '/module.js', async: true },
              injectTo: 'head',
            },
          ];
        },
      },
    ],
    build: {
      outDir: path.resolve(__dirname, 'dist-configurator'),
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '~': path.resolve(__dirname, 'app/scripts'),
        '~styles': path.resolve(__dirname, 'app/styles'),
      },
    },
  };
});
