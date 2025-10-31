import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import commonjs from 'vite-plugin-commonjs';
import svgr from 'vite-plugin-svgr';

export default defineConfig((cfg) => {
  const env = loadEnv(cfg.mode, process.cwd());

  return {
    plugins: [
      react(),
      commonjs(),
      svgr({ include: '**/*.svg' }),
    ],
    build: {
      outDir: path.resolve(__dirname, 'dist-configurator'),
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '~': path.resolve(__dirname, 'app'),
      },
    },
    server: {
      proxy: {
        '/api': env?.VITE_MQTT_BROKER_URI,
      },
    },
    define: {
      JSONEditor: 'window.JSONEditor',
    },
    optimizeDeps: {
      include: ['angular'],
    },
  };
});
