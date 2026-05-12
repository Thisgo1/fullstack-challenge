import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from "node:path";
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

export default defineConfig({
  plugins: [
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
      '^/(wallets|games)': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
