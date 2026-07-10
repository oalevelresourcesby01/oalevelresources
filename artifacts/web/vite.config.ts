import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: `http://localhost:${process.env["API_PORT"] || 3001}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist/public",
  },
});
