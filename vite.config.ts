import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    optimizeDeps: {
      include: ['@microsoft/microsoft-graph-client']
    },
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    build: {
      outDir: 'dist',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: {
        protocol: 'wss',
        clientPort: 443,
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          ws: false,
        }
      }
    },
  };
});
