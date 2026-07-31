import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': '/src' } },
  server: {
    port: 5175,
    proxy: { '/api': { target: 'http://localhost:8002', changeOrigin: true }, '/uploads': { target: 'http://localhost:8002', changeOrigin: true } },
  },
})
