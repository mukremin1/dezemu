import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { xmlFetchProxyPlugin } from "./vite-xml-proxy";

export default defineConfig({
  base: process.env.CAPACITOR_BUILD === "true" ? "/" : (process.env.NODE_ENV === "production" ? "/dezem-shop-spark/" : "/"),
  plugins: [react(), xmlFetchProxyPlugin()], // large XML feeds (hepsicdn) up to 150MB
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
