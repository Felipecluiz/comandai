import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    // Em dev, /api (inclusive o WebSocket do painel) vai para o `wrangler dev` (porta 8787)
    proxy: { "/api": { target: "http://localhost:8787", ws: true } },
  },
});
