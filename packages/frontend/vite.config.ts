import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? './' : '/',
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
  ],
  server: {
    port: 7000,
    proxy: {
      '/trpc': {
        target: process.env.VITE_BACKEND_URL || 'https://localhost:7001',
        changeOrigin: true
      }
    }
  }
}))


