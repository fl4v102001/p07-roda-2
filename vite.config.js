import { defineConfig } from 'vite';

export default defineConfig({
  root: 'frontend',
  server: {
    host: '127.0.0.1', // Força o Vite a rodar neste IP
    proxy: {
      '/ws': { // Redireciona o caminho /ws
        target: 'ws://127.0.0.1:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});