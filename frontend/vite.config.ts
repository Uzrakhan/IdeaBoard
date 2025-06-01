import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': process.env
    },
  server: {
    proxy: {
      '/socket.io': {
        target: process.env.VITE_BACKEND_URL,
        ws: true,
        changeOrigin: true
    }
  }
  }
})
