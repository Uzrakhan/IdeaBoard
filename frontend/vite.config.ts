import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: undefined,
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  },
  define: {
    'process.env': process.env
  },
  server: {
    host: true,
    proxy: {
      '/socket.io': {
        target: process.env.VITE_BACKEND_URL,
        ws: true,
        changeOrigin: true
      }
    }
  }
})
