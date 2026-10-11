import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/analyze': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/process': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/supported-formats': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/download': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
