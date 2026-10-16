import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: false,
    proxy: {
      '/api/nedrug': {
        target: 'https://nedrug.mfds.go.kr',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/nedrug/, ''),
      },
    },
  },
});
