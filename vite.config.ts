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
