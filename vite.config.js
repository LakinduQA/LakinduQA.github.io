import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  publicDir: "public",

  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: true,
    minify: "terser",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "home.html"),
        portfolio: resolve(__dirname, "portfolio.html"),
        demo: resolve(__dirname, "demo.html"),
      },
      external: ["fsevents"],
      output: {
        manualChunks: {
          vendor: ["vite"],
        },
      },
    },
  },

  server: {
    port: 3000,
    open: true,
    host: true,
  },

  preview: {
    port: 4173,
    open: true,
  },

  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@components": resolve(__dirname, "src/components"),
      "@styles": resolve(__dirname, "src/styles"),
      "@scripts": resolve(__dirname, "src/scripts"),
      "@utils": resolve(__dirname, "src/utils"),
    },
  },

  css: {
    devSourcemap: true,
  },

  optimizeDeps: {
    include: [],
  },
});
