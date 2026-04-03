import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiProxy = {
  "/api": {
    target: "http://localhost:3001",
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: apiProxy,
  },
  /** Same proxy as dev — without this, `vite preview` returns 404 for /api/* */
  preview: {
    proxy: apiProxy,
  },
});
