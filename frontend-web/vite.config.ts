import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Las llamadas /api/* y /socket.io/* van al gateway nginx en localhost:80.
      '/api': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
