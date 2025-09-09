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
    allowedHosts: ['*.localhost', '127.0.0.1', 'f7a159480d3e.ngrok-free.app, https://rootine.bardemic.com', 'https://api-rootine.bardemic.com'],
    port: 5050,
    proxy: {
      '/trpc': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:7001',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          (proxy as any).on('proxyReq', (proxyReq: any) => {
            proxyReq.setHeader('Origin', 'http://localhost:7000')
          })
        }
      },
      '/api/auth': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:7001',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          (proxy as any).on('proxyReq', (proxyReq: any) => {
            proxyReq.setHeader('Origin', 'http://localhost:7000')
          })
        }
      },
      '/api/upload': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:7001',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          (proxy as any).on('proxyReq', (proxyReq: any) => {
            proxyReq.setHeader('Origin', 'http://localhost:7000')
          })
        }
      },
      '/api/proxy-image': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:7001',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          (proxy as any).on('proxyReq', (proxyReq: any) => {
            proxyReq.setHeader('Origin', 'http://localhost:7000')
          })
        }
      }
    }
  }
}))


