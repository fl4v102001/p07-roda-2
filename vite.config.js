import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'frontend',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'frontend/index.html'),
        raffle: resolve(__dirname, 'frontend/raffle.html'),
      },
    },
  },
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