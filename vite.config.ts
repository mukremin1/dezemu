import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@components": path.resolve(__dirname, "src/components"),
      "@pages": path.resolve(__dirname, "src/pages"),
      "@utils": path.resolve(__dirname, "src/utils"),
      "@assets": path.resolve(__dirname, "src/assets"),
    },
  },
  build: {
    sourcemap: true,
    outDir: "dist",
    rollupOptions: {
      input: "index.html",
    },
  },
  base: "/", // GitHub Pages için "/" veya "/dezemu/" (repo adı ile eşleşmeli)
});
