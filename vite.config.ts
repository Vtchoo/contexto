import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  // Set root to the web directory
  root: path.resolve(__dirname, 'src/web'),
  
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/web/src'),
      '@components': path.resolve(__dirname, 'src/web/src/components'),
      '@pages': path.resolve(__dirname, 'src/web/src/pages'),
      '@hooks': path.resolve(__dirname, 'src/web/src/hooks'),
      '@utils': path.resolve(__dirname, 'src/web/src/utils'),
      '@styles': path.resolve(__dirname, 'src/web/src/styles'),
      '@api': path.resolve(__dirname, 'src/web/src/api'),
    },
  },
  server: {
    port: 3003,
    host: true, // Enable host binding for better Windows/WSL support
    watch: {
      usePolling: true, // Enable polling for file changes (helps on Windows)
      // interval: 1000, // Check for changes every 1 second
    },
    hmr: {
      overlay: true, // Show error overlay on HMR failures
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    // Output to dist/public from project root
    outDir: path.resolve(__dirname, 'dist/public'),
    sourcemap: false, // Disable sourcemaps in production for smaller bundle
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          socket: ['socket.io-client'],
        },
      },
    },
    // Ensure assets are properly handled
    assetsDir: 'assets',
    emptyOutDir: true, // Clear output directory before build
  },
  // Set base URL for production
  base: '/',
})
