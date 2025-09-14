// frontend/vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const config = {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
    },
  };

  // Only add proxy for development mode
  if (mode === 'development') {
    config.server.proxy = {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
        secure: false,
      },
      '/docs': {
        target: 'http://backend:8000',
        changeOrigin: true,
        secure: false,
      },
      '/redoc': {
        target: 'http://backend:8000',
        changeOrigin: true,
        secure: false,
      },
      '/openapi.json': {
        target: 'http://backend:8000',
        changeOrigin: true,
        secure: false,
      },
    };
  }

  return config;
});