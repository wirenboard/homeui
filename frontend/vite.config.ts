import { readFileSync } from 'fs';
import path from 'path';
import react from '@vitejs/plugin-react';
import { parse } from 'dotenv';
import { type ConfigEnv, loadEnv } from 'vite';
import svgr from 'vite-plugin-svgr';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }: ConfigEnv) => {
  const defaults = parse(readFileSync(path.resolve(__dirname, '.env.default')));
  const env = { ...defaults, ...loadEnv(mode, __dirname, '') };

  return {
    plugins: [
      react(),
      svgr({ include: '**/*.svg' }),
    ] as any[],
    build: {
      sourcemap: true,
      chunkSizeWarningLimit: 1100,
      minify: 'oxc' as const,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'plotly',
                test: /[\\/]node_modules[\\/](plotly\.js-basic-dist-min|plotly\.js-locales|react-plotly\.js)[\\/]/,
                priority: 25,
              },
              {
                name: 'react-ui-libs',
                test: /[\\/]node_modules[\\/](react-select|react-responsive|react-responsive-carousel)[\\/]/,
                priority: 20,
              },
              {
                name: 'react',
                test: /[\\/]node_modules[\\/](react|react-dom|mobx|mobx-react-lite)[\\/]/,
                priority: 15,
              },
              {
                name: 'codemirror',
                test: /[\\/]node_modules[\\/](@codemirror|@uiw)[\\/]/,
                priority: 13,
              },
              {
                name: 'jsoneditor',
                test: /[\\/]node_modules[\\/]@wirenboard[\\/]json-editor[\\/]/,
                priority: 12,
              },
              {
                name: 'lodash',
                test: /[\\/]node_modules[\\/]lodash[\\/]/,
                priority: 11,
              },
              {
                name: 'mqtt',
                test: /[\\/]node_modules[\\/](mqtt|mqtt-packet)[\\/]/,
                priority: 10,
              },
            ],
          },
        },
      },
    },
    define: {
      __APP_NAME__: JSON.stringify(env.APP_NAME || 'Wiren Board Web UI'),
      __APP_SHORT_NAME__: JSON.stringify(env.APP_SHORT_NAME || 'WB UI'),
      __LOGO__: JSON.stringify(env.LOGO || '/images/logo.svg'),
      __LOGO_COMPACT__: JSON.stringify(env.LOGO_COMPACT || '/images/logo-round.svg'),
      __HIDE_COMPACT_MENU__: env.HIDE_COMPACT_MENU === 'true',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 8080,
      open: true,
      proxy: {
        '^/(fwupdate|auth|mqtt|device|diag|ui|api/https|api/check|api/dashboards|api/integrations/alice)': {
          target: env.MQTT_BROKER_URI,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
