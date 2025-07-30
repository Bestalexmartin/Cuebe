// frontend/vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // Add this line
    port: 5173,       // Add this line
    proxy: {
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
    },
  },
});