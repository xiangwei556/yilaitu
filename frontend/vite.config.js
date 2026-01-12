import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 80,
    host: '0.0.0.0',
    allowedHosts: ['yilaitu.com', '0.0.0.0', 'localhost', 'nonsecludedly-sewable-napoleon.ngrok-free.dev',"zr848436ml96.vicp.fun"],
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        // Add WebSocket support for proxy
        ws: true,
        rewrite: (path) => path
      }
    }
  }
})
