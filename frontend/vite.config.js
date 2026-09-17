import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Allows importing with @ instead of relative paths
      // e.g., import Button from '@/components/ui/Button'
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // Proxy API calls to FastAPI backend during development
    // This avoids CORS issues and makes calls cleaner
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8002",
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
