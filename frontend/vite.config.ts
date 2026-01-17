import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';

// https://vite.dev/config/
export default defineConfig({
  build: {
    sourcemap: false,
    minify: false,
  },
  plugins: [
    react({
      babel: {
        // plugins: [
        //   'react-dev-locator',
        // ],
      },
    }),
    // traeBadgePlugin({
    //   variant: 'dark',
    //   position: 'bottom-right',
    //   prodOnly: true,
    //   clickable: true,
    //   clickUrl: 'https://www.trae.ai/solo?showJoin=1',
    //   autoTheme: true,
    //   autoThemeTarget: '#root'
    // }),  
    tsconfigPaths()
  ],
  server: {
    port: 80,
    host: '0.0.0.0',
    allowedHosts: ['yilaitu.com', '0.0.0.0', 'localhost', 'nonsecludedly-sewable-napoleon.ngrok-free.dev', 'zr848436ml96.vicp.fun'],
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        // Add WebSocket support for proxy
        ws: true,
        // Support rewrite if needed
        rewrite: (path) => path
      }
    }
  }
})
