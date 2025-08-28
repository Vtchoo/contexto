import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from monorepo root
  const env = loadEnv(mode, path.resolve(__dirname, '../../'), '')
  const API_URL = env.VITE_API_URL || 'http://localhost:3001'
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@styles': path.resolve(__dirname, './src/styles'),
        '@api': path.resolve(__dirname, './src/api'),
        '@contexto/core': path.resolve(__dirname, '../core/src'),
      },
    },
    server: {
      port: 3002,
      host: true,
      watch: {
        usePolling: true,
      },
      hmr: {
        overlay: true,
      },
      proxy: {
        '/api': {
          target: API_URL,
          changeOrigin: true,
        },
        '/socket.io': {
          target: API_URL,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: {
      outDir: './dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            socket: ['socket.io-client'],
          },
        },
      },
      assetsDir: 'assets',
      emptyOutDir: true,
    },
    base: '/',
    // Load env files from monorepo root
    envDir: path.resolve(__dirname, '../../'),
  }
})
