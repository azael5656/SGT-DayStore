import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// VITE_PROXY_TARGET permite cambiar a donde se reenvian /api y /socket.io.
//   - Host (npm run dev en tu PC): 'http://localhost' (nginx expone :80 al host).
//   - Docker (servicio frontend-web en compose): 'http://nginx' (DNS de la red).
const proxyTarget = process.env.VITE_PROXY_TARGET ?? 'http://localhost';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Acepta hostnames distintos a localhost cuando corre dentro de un
    // contenedor (HMR sigue funcionando contra el puerto publicado).
    strictPort: true,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
      '/socket.io': {
        target: proxyTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
