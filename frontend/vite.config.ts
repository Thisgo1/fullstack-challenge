import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from "node:path";
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

export default defineConfig({
  plugins: [
    // Certifique-se de usar o novo nome aqui
    TanStackRouterVite(),
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "#": path.resolve(__dirname, "./src"),
    }
  },
  server: {
    port: 3000,
    proxy: {
      // Proxy requests starting with /wallets or /games to Kong
      '^/(wallets|games)': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // No rewrite needed because the paths match Kong's expected routes
      },
      // Keep socket.io proxying if needed
      // '/socket.io': {
      //   target: 'http://localhost:8000',
      //   ws: true,
      //   changeOrigin: true,
      // },
    },
  },
});
