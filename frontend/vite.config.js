import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // aceita conexões de fora do container
    port: 5173,
    watch: { usePolling: process.env.VITE_USE_POLLING === 'true' },
    // O navegador chama /api/... e o Vite repassa para a API.
    // Assim o frontend não precisa saber a porta da API.
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
