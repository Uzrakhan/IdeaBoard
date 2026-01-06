import { defineConfig, loadEnv } from 'vite' // 1. IMPORT loadEnv
import react from '@vitejs/plugin-react'

// You must change the export to an async function to manually load environment variables
export default defineConfig(({ mode }) => {
  // 2. MANUALLY LOAD ALL ENV VARIABLES FOR USE IN THE CONFIG FILE
  // The third parameter '' loads ALL variables (even non-VITE_ prefixed ones)
  // This is safe because it only happens here in the config file (Node.js)
  const env = loadEnv(mode, process.cwd(), ''); 

  // 3. DEFINE ONLY SAFE/NECESSARY VARIABLES FOR CLIENT-SIDE COMPATIBILITY
  // The client code typically only needs NODE_ENV, or maybe a few VITE_ prefixed variables
  const clientSideDefine = {
    // SECURITY FIX: Only expose the environment mode
    'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV),
    
    // Optional: If you have a library that needs a specific variable (e.g. process.env.VITE_MY_KEY)
    // you would expose it selectively like this:
    // 'process.env.VITE_MY_KEY': JSON.stringify(env.VITE_MY_KEY),
  };

  return {
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
    // 4. USE THE SAFE, SELECTIVE DEFINE BLOCK
    define: clientSideDefine, 
    
    server: {
      host: true,
      proxy: {
        '/socket.io': {
          // This uses the variable loaded by loadEnv, which is correct
          target: env.VITE_BACKEND_URL, 
          ws: true,
          changeOrigin: true
        }
      }
    }
  }
});